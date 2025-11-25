<?php

use App\Http\Requests\StoreDocumentRequest;
use App\Models\DeviceToken;
use App\Models\Document;
use App\Models\Notification;
use App\Models\User;
use App\Models\Person;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

if (! function_exists('map_document_response')) {
    function map_document_response(Document $document, ?Request $request = null): array
    {
        $root = $request ? $request->getSchemeAndHttpHost() : config('app.url');
        if (! $root) {
            $root = config('app.url');
        }
        $root = rtrim($root ?? '', '/');

        $storagePath = $root.'/storage/'.ltrim($document->file_path, '/');

        return [
            'id' => $document->id,
            'name' => $document->name,
            'original_name' => $document->original_name,
            'file_size' => $document->file_size,
            'mime_type' => $document->mime_type,
            'is_public' => $document->is_public,
            'file_url' => $storagePath,
            'created_at' => optional($document->created_at)->toDateTimeString(),
            'updated_at' => optional($document->updated_at)->toDateTimeString(),
        ];
    }
}

if (! function_exists('send_push_notification')) {
    /**
     * Send push notification via Expo Push Notification service
     *
     * @param  array<string>  $tokens  Array of Expo push tokens
     * @param  string  $title  Notification title
     * @param  string  $body  Notification body
     * @param  array<string, mixed>  $data  Additional data to send with notification
     * @return array<string, mixed>|null
     */
    function send_push_notification(array $tokens, string $title, string $body, array $data = []): ?array
    {
        if (empty($tokens)) {
            return null;
        }

        $expoAccessToken = env('EXPO_ACCESS_TOKEN');
        $expoApiUrl = 'https://exp.host/--/api/v2/push/send';

        $messages = [];
        foreach ($tokens as $token) {
            $messages[] = [
                'to' => $token,
                'sound' => 'default',
                'title' => $title,
                'body' => $body,
                'data' => $data,
            ];
        }

        $headers = [
            'Accept' => 'application/json',
            'Accept-Encoding' => 'gzip, deflate',
            'Content-Type' => 'application/json',
        ];

        if ($expoAccessToken) {
            $headers['Authorization'] = 'Bearer '.$expoAccessToken;
        }

        try {
            $response = Http::withHeaders($headers)
                ->post($expoApiUrl, $messages);

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Push notification error: '.$e->getMessage());

            return null;
        }
    }
}

if (! function_exists('format_activity_value')) {
    /**
     * Normalize values before storing them in activity log properties.
     *
     * @param  mixed  $value
     * @return mixed
     */
    function format_activity_value($value)
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('c');
        }

        if (is_array($value)) {
            return array_values($value);
        }

        if (is_object($value)) {
            if ($value instanceof \JsonSerializable) {
                return $value->jsonSerialize();
            }

            if (method_exists($value, '__toString')) {
                return (string) $value;
            }

            $encoded = json_encode($value);

            if ($encoded === false) {
                return null;
            }

            return json_decode($encoded, true);
        }

        return $value;
    }
}

if (! function_exists('person_change_details')) {
    /**
     * Build a structured list of changes for activity logging.
     *
     * @param  array<string, mixed>  $dirtyAttributes
     * @return array<string, array{old:mixed,new:mixed}>
     */
    function person_change_details(Person $person, array $dirtyAttributes): array
    {
        $changes = [];

        foreach ($dirtyAttributes as $attribute => $newValue) {
            $changes[$attribute] = [
                'old' => format_activity_value($person->getOriginal($attribute)),
                'new' => format_activity_value($newValue),
            ];
        }

        return $changes;
    }
}


Route::get('/ping', function () {
    return response()->json([
        'message' => 'pong from Laravel API',
        'time'    => now()->toDateTimeString(),
    ]);
});

Route::post('/register', function (Request $request) {
    $data = $request->validate([
        'name' => ['required', 'string', 'max:255'],
        'email' => ['required', 'email', 'max:255', 'unique:users,email'],
        'password' => ['required', 'string', 'min:8', 'confirmed'],
    ]);

    $user = User::create([
        'name' => $data['name'],
        'email' => $data['email'],
        'password' => \Illuminate\Support\Facades\Hash::make($data['password']),
        'is_admin' => false,
        'approved_at' => null, // New users need admin approval
    ]);

    // Log registration activity
    ActivityLogger::log(
        'auth.register',
        __('New user registered: :name (:email)', [
            'name' => $user->name,
            'email' => $user->email,
        ]),
        $user,
        ['via' => 'mobile_app']
    );

    return response()->json([
        'message' => 'Registration successful. Your account is pending admin approval.',
        'user' => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => false,
            'is_approved' => false,
        ],
    ], 201);
});

Route::post('/login', function (Request $request) {
    $credentials = $request->validate([
        'email'    => ['required', 'email'],
        'password' => ['required', 'string'],
    ]);

    if (!Auth::attempt($credentials)) {
        return response()->json([
            'message' => 'Invalid credentials.',
        ], 422);
    }

    /** @var \App\Models\User $user */
    $user = Auth::user();

    // Check if user is approved (admins are auto-approved)
    if (! $user->isAdmin() && ! $user->isApproved()) {
        Auth::logout();
        return response()->json([
            'message' => 'Your account is pending admin approval. Please wait for approval before signing in.',
            'requires_approval' => true,
        ], 403);
    }

    $token = $user->createToken('mobile')->plainTextToken;

    // Log login activity
    ActivityLogger::log(
        'auth.login',
        __(':name logged in via mobile app', ['name' => $user->name]),
        $user
    );

    return response()->json([
        'token' => $token,
        'user'  => [
            'id'       => $user->id,
            'name'     => $user->name,
            'nickname' => $user->nickname,
            'email'    => $user->email,
            'is_admin' => $user->is_admin ?? false,
        ],
    ]);
});

Route::middleware(['auth:sanctum', 'approved.api'])->group(function () {
    Route::get('/dashboard', function (Request $request) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Upcoming birthdays
        $upcomingBirthdays = Person::query()
            ->upcomingBirthdays(30)
            ->with('user')
            ->get()
            ->map(function (Person $person) use ($user) {
                return [
                    'id'                    => $person->id,
                    'name'                  => $person->name,
                    'nric'                  => $person->nric,
                    'date_of_birth'         => optional($person->date_of_birth)->toDateString(),
                    'next_birthday_date'    => $person->next_birthday->toDateString(),
                    'days_until'            => $person->days_until_birthday,
                    'owned_by_current_user' => $person->user_id === $user->id,
                    'owner_name'            => optional($person->user)->name,
                ];
            })
            ->values();

        // My people (owned by current user + shared with user)
        $ownedPeople = $user->people()
            ->orderBy('name')
            ->get();

        $sharedPeople = $user->sharedPeople()
            ->with('user')
            ->orderBy('name')
            ->get();

        $myPeople = $ownedPeople->concat($sharedPeople)
            ->unique('id')
            ->map(function (Person $person) use ($user) {
                $age = $person->age_breakdown;
                $isShared = $person->user_id !== $user->id;

                return [
                    'id'            => $person->id,
                    'name'          => $person->name,
                    'nric'          => $person->nric,
                    'email'         => $person->email,
                    'phone'         => $person->phone,
                    'gender'        => $person->gender,
                    'date_of_birth' => optional($person->date_of_birth)->toDateString(),
                    'age_years'     => $age['years'],
                    'age_months'    => $age['months'],
                    'is_shared'     => $isShared,
                    'owner_name'    => $isShared ? optional($person->user)->name : null,
                ];
            })
            ->values();

        $myPeopleCount  = $myPeople->count();
        $allPeopleCount = Person::count();
        $favoritesCount = $user->favorites()->count();

        // Upcoming events (next 30 days)
        $now = now()->startOfDay();
        $upcomingEvents = \App\Models\Event::where('event_date', '>=', $now->toDateString())
            ->where('event_date', '<=', $now->copy()->addDays(30)->toDateString())
            ->orderBy('event_date', 'asc')
            ->get()
            ->map(function ($event) use ($now) {
                $eventDate = \Carbon\Carbon::parse($event->event_date)->startOfDay();
                $daysUntil = (int) floor($now->diffInDays($eventDate, false));
                
                return [
                    'id' => $event->id,
                    'name' => $event->name,
                    'event_date' => $event->event_date->toDateString(),
                    'days_until' => $daysUntil >= 0 ? $daysUntil : null,
                ];
            })
            ->values();

        return response()->json([
            'user' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ],
            'stats' => [
                'my_people_count'  => $myPeopleCount,
                'all_people_count' => $allPeopleCount,
                'favorites_count'  => $favoritesCount,
            ],
            'upcoming_birthdays' => $upcomingBirthdays,
            'upcoming_events' => $upcomingEvents,
            'my_people'          => $myPeople,
        ]);
    });

    Route::get('/statistics', function (Request $request) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $totalPeople = \App\Models\Person::count();
        $totalUsers = \App\Models\User::count();
        $totalDocuments = \App\Models\Document::count();
        $peopleThisMonth = \App\Models\Person::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();
        $usersThisMonth = \App\Models\User::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();
        $documentsThisMonth = \App\Models\Document::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        $genderDistribution = \App\Models\Person::selectRaw('gender, COUNT(*) as count')
            ->groupBy('gender')
            ->get()
            ->pluck('count', 'gender')
            ->toArray();

        $documentTypes = \App\Models\Document::selectRaw('
            CASE 
                WHEN mime_type LIKE "image/%" THEN "Images"
                WHEN mime_type LIKE "application/pdf" THEN "PDFs"
                ELSE "Other"
            END as type,
            COUNT(*) as count
        ')
            ->groupBy('type')
            ->get()
            ->pluck('count', 'type')
            ->toArray();

        $connection = \Illuminate\Support\Facades\DB::connection()->getDriverName();
        if ($connection === 'sqlite') {
            $topUsers = \App\Models\User::whereHas('people')
                ->withCount('people')
                ->orderBy('people_count', 'desc')
                ->limit(5)
                ->get()
                ->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'people_count' => $u->people_count,
                ]);
        } else {
            $topUsers = \App\Models\User::withCount('people')
                ->having('people_count', '>', 0)
                ->orderBy('people_count', 'desc')
                ->limit(5)
                ->get()
                ->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'people_count' => $u->people_count,
                ]);
        }

        $people = \App\Models\Person::whereNotNull('date_of_birth')->get();
        $ageGroups = [
            '0-17' => 0,
            '18-25' => 0,
            '26-35' => 0,
            '36-50' => 0,
            '51-65' => 0,
            '65+' => 0,
        ];

        foreach ($people as $person) {
            if (!$person->date_of_birth) {
                continue;
            }
            $age = $person->date_of_birth->diffInYears(now());
            if ($age < 18) {
                $ageGroups['0-17']++;
            } elseif ($age <= 25) {
                $ageGroups['18-25']++;
            } elseif ($age <= 35) {
                $ageGroups['26-35']++;
            } elseif ($age <= 50) {
                $ageGroups['36-50']++;
            } elseif ($age <= 65) {
                $ageGroups['51-65']++;
            } else {
                $ageGroups['65+']++;
            }
        }

        $publicDocuments = \App\Models\Document::where('is_public', true)->count();
        $privateDocuments = \App\Models\Document::where('is_public', false)->count();
        $peopleWithDocs = \App\Models\Person::has('documents')->count();
        $averageDocumentsPerPerson = $peopleWithDocs > 0 ? round($totalDocuments / $peopleWithDocs, 1) : 0;

        return response()->json([
            'overview' => [
                'total_people' => $totalPeople,
                'total_users' => $totalUsers,
                'total_documents' => $totalDocuments,
                'people_this_month' => $peopleThisMonth,
                'users_this_month' => $usersThisMonth,
                'documents_this_month' => $documentsThisMonth,
            ],
            'gender_distribution' => $genderDistribution,
            'document_types' => $documentTypes,
            'document_visibility' => [
                'public' => $publicDocuments,
                'private' => $privateDocuments,
            ],
            'top_users' => $topUsers,
            'age_groups' => $ageGroups,
            'additional_metrics' => [
                'average_documents_per_person' => $averageDocumentsPerPerson,
                'people_with_documents' => $peopleWithDocs,
                'people_without_documents' => \App\Models\Person::doesntHave('documents')->count(),
            ],
        ]);
    });

    Route::put('/profile', function (Request $request) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'nickname' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', \Illuminate\Validation\Rule::unique('users')->ignore($user->id)],
        ]);

        $user->update($data);

        // Log activity
        ActivityLogger::log(
            'profile.updated',
            __(':name updated their profile', ['name' => $user->name]),
            $user,
            ['via' => 'mobile_app']
        );

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'nickname' => $user->nickname,
                'email' => $user->email,
            ],
            'message' => 'Profile updated successfully.',
        ]);
    });

    Route::put('/profile/password', function (Request $request) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (!\Illuminate\Support\Facades\Hash::check($data['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        $user->update([
            'password' => \Illuminate\Support\Facades\Hash::make($data['password']),
        ]);

        // Log activity
        ActivityLogger::log(
            'profile.password_changed',
            __(':name changed their password', ['name' => $user->name]),
            $user,
            ['via' => 'mobile_app']
        );

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    });

    Route::get('/chat/messages', function (Request $request) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $messages = \App\Models\Message::with('user:id,name,nickname,email')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($message) use ($user) {
                return [
                    'id' => $message->id,
                    'user_id' => $message->user_id,
                    'user_name' => $message->user->nickname ?? $message->user->name,
                    'message' => $message->message,
                    'is_own' => $message->user_id === $user->id,
                    'created_at' => $message->created_at->toISOString(),
                ];
            });

        return response()->json([
            'messages' => $messages,
        ]);
    });

    Route::post('/chat/messages', function (Request $request) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $data = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $message = \App\Models\Message::create([
            'user_id' => $user->id,
            'message' => $data['message'],
        ]);

        $message->load('user:id,name,nickname,email');

        $displayName = $user->nickname ?? $user->name;

        // Log activity
        ActivityLogger::log(
            'chat.message_sent',
            __(':name sent a chat message', ['name' => $displayName]),
            $message,
            ['via' => 'mobile_app']
        );

        // Send push notifications to all users except the sender
        $allUsers = \App\Models\User::where('id', '!=', $user->id)->get();
        $pushTokens = [];
        foreach ($allUsers as $targetUser) {
            $userTokens = $targetUser->deviceTokens()->pluck('token')->toArray();
            $pushTokens = array_merge($pushTokens, $userTokens);
        }

        // Send push notifications (without creating notification entries)
        if (! empty($pushTokens)) {
            $messagePreview = strlen($data['message']) > 100 
                ? substr($data['message'], 0, 100) . '...' 
                : $data['message'];
            
            send_push_notification(
                $pushTokens,
                'New Message',
                "{$displayName}: {$messagePreview}",
                [
                    'type' => 'chat_message',
                    'message_id' => $message->id,
                ]
            );
        }

        return response()->json([
            'message' => [
                'id' => $message->id,
                'user_id' => $message->user_id,
                'user_name' => $displayName,
                'message' => $message->message,
                'is_own' => true,
                'created_at' => $message->created_at->toISOString(),
            ],
        ], 201);
    });

    Route::get('/people/{person}', function (Request $request, Person $person) {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        $person->loadMissing('user');
        $age = $person->age_breakdown;
        $documentsQuery = $person->documents()->latest();

        if (! $person->canBeAccessedBy($user)) {
            $documentsQuery->where('is_public', true);
        }

        $documents = $documentsQuery
            ->get()
            ->map(fn (Document $document) => map_document_response($document, $request))
            ->values();

        $canManageDocuments = $person->canBeAccessedBy($user);

        return response()->json([
            'person' => [
                'id'            => $person->id,
                'name'          => $person->name,
                'nric'          => $person->nric,
                'email'         => $person->email,
                'phone'         => $person->phone,
                'gender'        => $person->gender,
                'blood_type'    => $person->blood_type,
                'occupation'    => $person->occupation,
                'address'       => $person->address,
                'date_of_birth' => optional($person->date_of_birth)->toDateString(),
                'age_years'     => $age['years'],
                'age_months'    => $age['months'],
                'owner_id'      => $person->user_id,
                'owner_name'    => optional($person->user)->name,
                'created_at'    => optional($person->created_at)->toDateTimeString(),
                'updated_at'    => optional($person->updated_at)->toDateTimeString(),
                'documents'     => $documents,
                'can_manage_documents' => (bool) $canManageDocuments,
            ],
        ]);
    });

    Route::post('/people', function (Request $request) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $data = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'nric'          => ['required', 'string', 'max:255', 'unique:people,nric'],
            'date_of_birth' => ['nullable', 'date'],
            'gender'        => ['nullable', 'string', 'max:50'],
            'blood_type'    => ['nullable', 'string', 'max:10'],
            'occupation'    => ['nullable', 'string', 'max:255'],
            'address'       => ['nullable', 'string', 'max:500'],
            'phone'         => ['nullable', 'array', 'max:4'],
            'phone.*'       => ['nullable', 'string', 'max:255'],
            'email'         => ['nullable', 'email', 'max:255'],
        ]);
        
        // Filter out empty phone numbers
        if (isset($data['phone']) && is_array($data['phone'])) {
            $data['phone'] = array_values(array_filter($data['phone'], fn($p) => !empty(trim($p ?? ''))));
            if (empty($data['phone'])) {
                $data['phone'] = null;
            }
        }

        $person = $user->people()->create($data);
        $person->loadMissing('user');
        $age = $person->age_breakdown;

        // Log activity
        ActivityLogger::log(
            'person.created',
            __(':name created a new person: :person_name', ['name' => $user->name, 'person_name' => $person->name]),
            $person,
            ['via' => 'mobile_app']
        );

        // Create notifications for all users
        $allUsers = User::all();
        $notifications = [];
        $pushTokens = [];
        foreach ($allUsers as $targetUser) {
            $notifications[] = [
                'user_id' => $targetUser->id,
                'type' => 'person_created',
                'title' => 'New Person Added',
                'message' => "{$user->name} added a new person: {$person->name}",
                'person_id' => $person->id,
                'read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            // Collect push tokens for this user
            $userTokens = $targetUser->deviceTokens()->pluck('token')->toArray();
            $pushTokens = array_merge($pushTokens, $userTokens);
        }
        Notification::insert($notifications);

        // Send push notifications
        if (! empty($pushTokens)) {
            send_push_notification(
                $pushTokens,
                'New Person Added',
                "{$user->name} added a new person: {$person->name}",
                [
                    'type' => 'person_created',
                    'person_id' => $person->id,
                ]
            );
        }

        return response()->json([
            'person' => [
                'id'            => $person->id,
                'name'          => $person->name,
                'nric'          => $person->nric,
                'email'         => $person->email,
                'phone'         => $person->phone,
                'gender'        => $person->gender,
                'blood_type'    => $person->blood_type,
                'occupation'    => $person->occupation,
                'address'       => $person->address,
                'date_of_birth' => optional($person->date_of_birth)->toDateString(),
                'age_years'     => $age['years'],
                'age_months'    => $age['months'],
                'owner_id'      => $person->user_id,
                'owner_name'    => optional($person->user)->name,
                'created_at'    => optional($person->created_at)->toDateTimeString(),
                'updated_at'    => optional($person->updated_at)->toDateTimeString(),
                'documents'     => [],
                'can_manage_documents' => true,
            ],
        ], 201);
    });

    Route::put('/people/{person}', function (Request $request, Person $person) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if ($person->user_id !== $user->id) {
            return response()->json([
                'message' => 'You are not allowed to edit this person.',
            ], 403);
        }

        $data = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'nric'          => [
                'required',
                'string',
                'max:255',
                Rule::unique('people', 'nric')->ignore($person->id),
            ],
            'date_of_birth' => ['nullable', 'date'],
            'gender'        => ['nullable', 'string', 'max:50'],
            'blood_type'    => ['nullable', 'string', 'max:10'],
            'occupation'    => ['nullable', 'string', 'max:255'],
            'address'       => ['nullable', 'string', 'max:500'],
            'phone'         => ['nullable', 'array', 'max:4'],
            'phone.*'       => ['nullable', 'string', 'max:255'],
            'email'         => ['nullable', 'email', 'max:255'],
        ]);
        
        // Filter out empty phone numbers
        if (isset($data['phone']) && is_array($data['phone'])) {
            $data['phone'] = array_values(array_filter($data['phone'], fn($p) => !empty(trim($p ?? ''))));
            if (empty($data['phone'])) {
                $data['phone'] = null;
            }
        }

        $person->fill($data);
        $dirtyAttributes = $person->getDirty();
        $changeDetails = [];

        if (! empty($dirtyAttributes)) {
            $changeDetails = person_change_details($person, $dirtyAttributes);
            $person->save();
        }

        $person->refresh()->loadMissing('user');
        $age = $person->age_breakdown;

        if (! empty($changeDetails)) {
            ActivityLogger::log(
                'person.updated',
                __(':name updated person: :person_name', ['name' => $user->name, 'person_name' => $person->name]),
                $person,
                [
                    'via' => 'mobile_app',
                    'changes' => $changeDetails,
                ]
            );
        }

        return response()->json([
            'person' => [
                'id'            => $person->id,
                'name'          => $person->name,
                'nric'          => $person->nric,
                'email'         => $person->email,
                'phone'         => $person->phone,
                'gender'        => $person->gender,
                'blood_type'    => $person->blood_type,
                'occupation'    => $person->occupation,
                'address'       => $person->address,
                'date_of_birth' => optional($person->date_of_birth)->toDateString(),
                'age_years'     => $age['years'],
                'age_months'    => $age['months'],
                'owner_id'      => $person->user_id,
                'owner_name'    => optional($person->user)->name,
                'created_at'    => optional($person->created_at)->toDateTimeString(),
                'updated_at'    => optional($person->updated_at)->toDateTimeString(),
                'documents'     => $person->documents()->latest()->get()->map(fn (Document $document) => map_document_response($document, $request))->values(),
                'can_manage_documents' => true,
            ],
        ]);
    });

    Route::delete('/people/{person}', function (Request $request, Person $person) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Only owner can delete (not shared users)
        if ($person->user_id !== $user->id && ! $user->isAdmin()) {
            return response()->json([
                'message' => 'You are not allowed to delete this person.',
            ], 403);
        }

        $person->loadMissing('documents');
        $personName = $person->name;
        $personId = $person->id;

        foreach ($person->documents as $document) {
            Storage::disk('public')->delete($document->file_path);
            $document->delete();
        }

        $person->delete();

        // Log activity
        ActivityLogger::log(
            'person.deleted',
            __(':name deleted person: :person_name', ['name' => $user->name, 'person_name' => $personName]),
            null,
            ['person_id' => $personId, 'via' => 'mobile_app']
        );

        return response()->noContent();
    });

    Route::get('/people/{person}/documents', function (Request $request, Person $person) {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        $documentsQuery = $person->documents()->latest();

        if (! $person->canBeAccessedBy($user)) {
            $documentsQuery->where('is_public', true);
        }

        $documents = $documentsQuery
            ->get()
            ->map(fn (Document $document) => map_document_response($document, $request))
            ->values();

        return response()->json([
            'documents' => $documents,
        ]);
    });

    Route::post('/people/{person}/documents', function (StoreDocumentRequest $request, Person $person) {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        if (! $person->canBeAccessedBy($user)) {
            return response()->json([
                'message' => 'You are not allowed to upload documents for this person.',
            ], 403);
        }

        $validated = $request->validated();
        $file = $request->file('file');
        $path = $file->store('documents', 'public');

        $document = $person->documents()->create([
            'name' => $validated['name'],
            'file_path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'is_public' => (bool) ($validated['is_public'] ?? false),
        ]);

        // Log activity
        ActivityLogger::log(
            'document.created',
            __(':name uploaded document ":doc_name" for :person_name', [
                'name' => $user->name,
                'doc_name' => $document->name,
                'person_name' => $person->name,
            ]),
            $document,
            ['via' => 'mobile_app']
        );

        return response()->json([
            'document' => map_document_response($document, $request),
        ], 201);
    });

    Route::patch('/documents/{document}', function (Request $request, Document $document) {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        $document->loadMissing('person.user');

        if (! $document->person->canBeAccessedBy($user)) {
            return response()->json([
                'message' => 'You are not allowed to update this document.',
            ], 403);
        }

        $data = $request->validate([
            'is_public' => ['required', 'boolean'],
        ]);

        $document->update([
            'is_public' => $data['is_public'],
        ]);

        // Log activity
        ActivityLogger::log(
            'document.updated',
            __(':name updated document ":doc_name" visibility', [
                'name' => $user->name,
                'doc_name' => $document->name,
            ]),
            $document,
            ['via' => 'mobile_app', 'is_public' => $data['is_public']]
        );

        return response()->json([
            'document' => map_document_response($document, $request),
        ]);
    });

    Route::delete('/documents/{document}', function (Request $request, Document $document) {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        $document->loadMissing('person.user');

        if (! $document->person->canBeAccessedBy($user)) {
            return response()->json([
                'message' => 'You are not allowed to delete this document.',
            ], 403);
        }

        $documentName = $document->name;
        $documentId = $document->id;

        Storage::disk('public')->delete($document->file_path);
        $document->delete();

        // Log activity
        ActivityLogger::log(
            'document.deleted',
            __(':name deleted document ":doc_name"', [
                'name' => $user->name,
                'doc_name' => $documentName,
            ]),
            null,
            ['document_id' => $documentId, 'via' => 'mobile_app']
        );

        return response()->noContent();
    });

    Route::get('/notifications', function (Request $request) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $notifications = $user->notifications()
            ->with('person')
            ->latest()
            ->get()
            ->map(function (Notification $notification) {
                return [
                    'id' => $notification->id,
                    'type' => $notification->type,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'person_id' => $notification->person_id,
                    'read' => $notification->read,
                    'read_at' => optional($notification->read_at)->toDateTimeString(),
                    'created_at' => optional($notification->created_at)->toDateTimeString(),
                ];
            })
            ->values();

        $unreadCount = $user->notifications()->where('read', false)->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    });

    Route::patch('/notifications/{notification}/read', function (Request $request, Notification $notification) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if ($notification->user_id !== $user->id) {
            return response()->json([
                'message' => 'You are not allowed to update this notification.',
            ], 403);
        }

        $notification->markAsRead();

        return response()->json([
            'notification' => [
                'id' => $notification->id,
                'type' => $notification->type,
                'title' => $notification->title,
                'message' => $notification->message,
                'person_id' => $notification->person_id,
                'read' => $notification->read,
                'read_at' => optional($notification->read_at)->toDateTimeString(),
                'created_at' => optional($notification->created_at)->toDateTimeString(),
            ],
        ]);
    });

    Route::post('/notifications/mark-all-read', function (Request $request) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $user->notifications()
            ->where('read', false)
            ->update([
                'read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'message' => 'All notifications marked as read.',
        ]);
    });

    Route::post('/device-tokens', function (Request $request) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $data = $request->validate([
            'token' => ['required', 'string'],
            'platform' => ['nullable', 'string', 'in:ios,android,web'],
        ]);

        $deviceToken = DeviceToken::updateOrCreate(
            [
                'user_id' => $user->id,
                'token' => $data['token'],
            ],
            [
                'platform' => $data['platform'] ?? null,
            ]
        );

        return response()->json([
            'message' => 'Device token registered successfully.',
            'device_token' => [
                'id' => $deviceToken->id,
                'token' => $deviceToken->token,
                'platform' => $deviceToken->platform,
            ],
        ], 201);
    });

    Route::delete('/device-tokens/{token}', function (Request $request, string $token) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        DeviceToken::where('user_id', $user->id)
            ->where('token', $token)
            ->delete();

        return response()->noContent();
    });

    Route::post('/people/{person}/favorite', function (Request $request, Person $person) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $isFavorite = $user->favorites()->where('person_id', $person->id)->exists();

        if ($isFavorite) {
            // Remove from favorites
            $user->favorites()->detach($person->id);
            $message = 'Person removed from favorites.';
        } else {
            // Add to favorites
            $user->favorites()->attach($person->id);
            $message = 'Person added to favorites.';
        }

        // Log activity
        ActivityLogger::log(
            $isFavorite ? 'person.unfavorited' : 'person.favorited',
            __($isFavorite ? ':name removed :person_name from favorites' : ':name added :person_name to favorites', [
                'name' => $user->name,
                'person_name' => $person->name,
            ]),
            $person,
            ['via' => 'mobile_app']
        );

        return response()->json([
            'message' => $message,
            'is_favorite' => !$isFavorite,
        ]);
    });

    Route::post('/people/{person}/share', function (Request $request, Person $person) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Only owner can share
        if ($person->user_id !== $user->id && ! $user->isAdmin()) {
            return response()->json([
                'message' => 'You are not allowed to share this person.',
            ], 403);
        }

        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $sharedWithUserId = $data['user_id'];

        // Cannot share with yourself
        if ($sharedWithUserId === $user->id) {
            return response()->json([
                'message' => 'You cannot share a person with yourself.',
            ], 400);
        }

        // Check if already shared
        $existingShare = \App\Models\PersonShare::where('person_id', $person->id)
            ->where('shared_with_user_id', $sharedWithUserId)
            ->first();

        if ($existingShare) {
            return response()->json([
                'message' => 'This person is already shared with this user.',
            ], 400);
        }

        $share = \App\Models\PersonShare::create([
            'person_id' => $person->id,
            'shared_with_user_id' => $sharedWithUserId,
            'shared_by_user_id' => $user->id,
        ]);

        $sharedWithUser = \App\Models\User::find($sharedWithUserId);

        // Log activity
        ActivityLogger::log(
            'person.shared',
            __(':name shared :person_name with :shared_with', [
                'name' => $user->name,
                'person_name' => $person->name,
                'shared_with' => $sharedWithUser->name,
            ]),
            $person,
            ['via' => 'mobile_app', 'shared_with_user_id' => $sharedWithUserId]
        );

        return response()->json([
            'message' => 'Person shared successfully.',
            'share' => [
                'id' => $share->id,
                'person_id' => $share->person_id,
                'shared_with_user_id' => $share->shared_with_user_id,
                'shared_with_user_name' => $sharedWithUser->name,
                'shared_by_user_id' => $share->shared_by_user_id,
            ],
        ], 201);
    });

    Route::delete('/people/{person}/share/{share}', function (Request $request, Person $person, \App\Models\PersonShare $share) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Verify the share belongs to this person
        if ($share->person_id !== $person->id) {
            return response()->json([
                'message' => 'Invalid share.',
            ], 404);
        }

        // Only owner or the shared user can unshare
        if ($person->user_id !== $user->id && $share->shared_with_user_id !== $user->id && ! $user->isAdmin()) {
            return response()->json([
                'message' => 'You are not allowed to remove this share.',
            ], 403);
        }

        $sharedWithUser = $share->sharedWithUser;

        $share->delete();

        // Log activity
        ActivityLogger::log(
            'person.unshared',
            __(':name removed share of :person_name with :shared_with', [
                'name' => $user->name,
                'person_name' => $person->name,
                'shared_with' => $sharedWithUser->name,
            ]),
            $person,
            ['via' => 'mobile_app', 'shared_with_user_id' => $share->shared_with_user_id]
        );

        return response()->noContent();
    });

    Route::get('/people/{person}/shares', function (Request $request, Person $person) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // Only owner can view shares
        if ($person->user_id !== $user->id && ! $user->isAdmin()) {
            return response()->json([
                'message' => 'You are not allowed to view shares for this person.',
            ], 403);
        }

        $shares = $person->shares()
            ->with(['sharedWithUser:id,name,email', 'sharedByUser:id,name,email'])
            ->latest()
            ->get()
            ->map(function ($share) {
                return [
                    'id' => $share->id,
                    'shared_with_user_id' => $share->shared_with_user_id,
                    'shared_with_user_name' => optional($share->sharedWithUser)->name,
                    'shared_with_user_email' => optional($share->sharedWithUser)->email,
                    'shared_by_user_id' => $share->shared_by_user_id,
                    'shared_by_user_name' => optional($share->sharedByUser)->name,
                    'created_at' => optional($share->created_at)->toDateTimeString(),
                ];
            });

        return response()->json([
            'shares' => $shares,
        ]);
    });

    Route::get('/users', function (Request $request) {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $search = $request->string('search')->toString();

        $usersQuery = \App\Models\User::query()
            ->where('id', '!=', $user->id) // Exclude current user
            ->whereNotNull('approved_at') // Only approved users
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderBy('name');

        $users = $usersQuery->get()->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ];
        });

        return response()->json([
            'users' => $users,
        ]);
    });

    Route::get('/people', function (Request $request) {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $search = $request->string('search')->toString();

        // Get user's favorite person IDs
        $favoriteIds = $user->favorites()->pluck('person_id')->toArray();

        $peopleQuery = Person::query()
            ->with('user')
            ->when($search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->latest();

        $people = $peopleQuery->get()->map(function (Person $person) use ($favoriteIds) {
            $age = $person->age_breakdown;
            $isFavorite = in_array($person->id, $favoriteIds);

            return [
                'id'            => $person->id,
                'name'          => $person->name,
                'nric'          => $person->nric,
                'email'         => $person->email,
                'phone'         => $person->phone,
                'gender'        => $person->gender,
                'date_of_birth' => optional($person->date_of_birth)->toDateString(),
                'age_years'     => $age['years'],
                'age_months'    => $age['months'],
                'owner_name'    => optional($person->user)->name,
                'is_favorite'   => $isFavorite,
            ];
        })->sortByDesc(function ($person) {
            // Sort favorites first, then by created_at
            return [$person['is_favorite'] ? 1 : 0, $person['id']];
        })->values();

        return response()->json([
            'people' => $people,
        ]);
    });

    // Events - All authenticated users can view
    Route::get('/events', function (Request $request) {
        $events = \App\Models\Event::orderBy('event_date', 'asc')
            ->get()
            ->map(function ($event) {
                $now = now()->startOfDay();
                $eventDate = \Carbon\Carbon::parse($event->event_date)->startOfDay();
                $daysUntil = (int) floor($now->diffInDays($eventDate, false));
                
                return [
                    'id' => $event->id,
                    'name' => $event->name,
                    'event_date' => $event->event_date->toDateString(),
                    'days_until' => $daysUntil >= 0 ? $daysUntil : null,
                    'is_past' => $daysUntil < 0,
                    'created_at' => optional($event->created_at)->toDateTimeString(),
                    'updated_at' => optional($event->updated_at)->toDateTimeString(),
                ];
            })
            ->values();

        return response()->json([
            'events' => $events,
        ]);
    });
});

// Admin routes (only for admins)
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    // User Management
    Route::get('/users', function (Request $request) {
        $search = $request->string('search')->toString();
        $status = $request->string('status')->toString(); // 'all', 'approved', 'pending'

        $usersQuery = User::query()
            ->withCount('people')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($status === 'approved', function ($query) {
                $query->whereNotNull('approved_at');
            })
            ->when($status === 'pending', function ($query) {
                $query->whereNull('approved_at')->where('is_admin', false);
            })
            ->latest();

        $users = $usersQuery->get()->map(function (User $user) {
            // Count documents through people
            $documentsCount = \App\Models\Document::whereHas('person', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })->count();

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => $user->is_admin,
                'is_approved' => $user->isApproved(),
                'approved_at' => optional($user->approved_at)->toDateTimeString(),
                'people_count' => $user->people_count,
                'documents_count' => $documentsCount,
                'created_at' => optional($user->created_at)->toDateTimeString(),
            ];
        })->values();

        return response()->json([
            'users' => $users,
        ]);
    });

    Route::get('/users/{user}', function (Request $request, User $user) {
        $user->loadCount(['people', 'notifications', 'messages']);
        
        // Count documents through people
        $documentsCount = \App\Models\Document::whereHas('person', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })->count();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => $user->is_admin,
                'is_approved' => $user->isApproved(),
                'approved_at' => optional($user->approved_at)->toDateTimeString(),
                'people_count' => $user->people_count,
                'documents_count' => $documentsCount,
                'notifications_count' => $user->notifications_count,
                'messages_count' => $user->messages_count,
                'created_at' => optional($user->created_at)->toDateTimeString(),
                'updated_at' => optional($user->updated_at)->toDateTimeString(),
            ],
        ]);
    });

    Route::post('/users/{user}/approve', function (Request $request, User $user) {
        if ($user->isApproved()) {
            return response()->json([
                'message' => 'User is already approved.',
            ], 422);
        }

        $user->update(['approved_at' => now()]);

        // Log activity
        ActivityLogger::log(
            'admin.user_approved',
            __(':admin_name approved user: :user_name', [
                'admin_name' => $request->user()->name,
                'user_name' => $user->name,
            ]),
            $user,
            ['via' => 'mobile_app']
        );

        return response()->json([
            'message' => 'User approved successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_approved' => $user->isApproved(),
                'approved_at' => optional($user->approved_at)->toDateTimeString(),
            ],
        ]);
    });

    Route::post('/users/{user}/reject', function (Request $request, User $user) {
        /** @var \App\Models\User $admin */
        $admin = $request->user();

        if ($user->id === $admin->id) {
            return response()->json([
                'message' => 'You cannot reject your own account.',
            ], 422);
        }

        if ($user->isAdmin()) {
            return response()->json([
                'message' => 'You cannot reject an admin account.',
            ], 422);
        }

        $userName = $user->name;
        $userEmail = $user->email;
        $userId = $user->id;

        $user->delete();

        // Log activity
        ActivityLogger::log(
            'admin.user_rejected',
            __(':admin_name rejected and deleted user: :user_name', [
                'admin_name' => $request->user()->name,
                'user_name' => $userName,
            ]),
            null,
            ['user_id' => $userId, 'user_email' => $userEmail, 'via' => 'mobile_app']
        );

        return response()->json([
            'message' => 'User rejected and deleted successfully.',
        ]);
    });

    Route::post('/users/{user}/make-admin', function (Request $request, User $user) {
        if ($user->isAdmin()) {
            return response()->json([
                'message' => 'User is already an admin.',
            ], 422);
        }

        $user->update([
            'is_admin' => true,
            'approved_at' => now(), // Auto-approve admins
        ]);

        // Log activity
        ActivityLogger::log(
            'admin.user_promoted',
            __(':admin_name promoted :user_name to admin', [
                'admin_name' => $request->user()->name,
                'user_name' => $user->name,
            ]),
            $user,
            ['via' => 'mobile_app']
        );

        return response()->json([
            'message' => 'User promoted to admin successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => $user->is_admin,
                'is_approved' => $user->isApproved(),
            ],
        ]);
    });

    Route::post('/users/{user}/remove-admin', function (Request $request, User $user) {
        /** @var \App\Models\User $admin */
        $admin = $request->user();

        if ($user->id === $admin->id) {
            return response()->json([
                'message' => 'You cannot remove admin privileges from your own account.',
            ], 422);
        }

        if (! $user->isAdmin()) {
            return response()->json([
                'message' => 'User is not an admin.',
            ], 422);
        }

        $user->update(['is_admin' => false]);

        // Log activity
        ActivityLogger::log(
            'admin.admin_removed',
            __(':admin_name removed admin privileges from :user_name', [
                'admin_name' => $request->user()->name,
                'user_name' => $user->name,
            ]),
            $user,
            ['via' => 'mobile_app']
        );

        return response()->json([
            'message' => 'Admin privileges removed successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => $user->is_admin,
            ],
        ]);
    });

    Route::delete('/users/{user}', function (Request $request, User $user) {
        /** @var \App\Models\User $admin */
        $admin = $request->user();

        if ($user->id === $admin->id) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        if ($user->isAdmin()) {
            return response()->json([
                'message' => 'You cannot delete an admin account. Remove admin privileges first.',
            ], 422);
        }

        // Delete associated data
        $user->people()->each(function ($person) {
            $person->documents()->each(function ($document) {
                Storage::disk('public')->delete($document->file_path);
                $document->delete();
            });
            $person->delete();
        });

        $user->notifications()->delete();
        $user->deviceTokens()->delete();
        $user->messages()->delete();
        $user->suggestions()->delete();

        $userName = $user->name;
        $userEmail = $user->email;
        $userId = $user->id;

        $user->delete();

        // Log activity
        ActivityLogger::log(
            'admin.user_deleted',
            __(':admin_name deleted user: :user_name', [
                'admin_name' => $request->user()->name,
                'user_name' => $userName,
            ]),
            null,
            ['user_id' => $userId, 'user_email' => $userEmail, 'via' => 'mobile_app']
        );

        return response()->noContent();
    });

    // People Management (Admin can manage all people)
    Route::get('/people', function (Request $request) {
        $search = $request->string('search')->toString();
        $userId = $request->integer('user_id', 0);

        $peopleQuery = Person::query()
            ->with('user')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('nric', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($userId > 0, function ($query) use ($userId) {
                $query->where('user_id', $userId);
            })
            ->latest();

        $people = $peopleQuery->get()->map(function (Person $person) {
            $age = $person->age_breakdown;

            return [
                'id' => $person->id,
                'name' => $person->name,
                'nric' => $person->nric,
                'email' => $person->email,
                'phone' => $person->phone,
                'gender' => $person->gender,
                'blood_type' => $person->blood_type,
                'occupation' => $person->occupation,
                'address' => $person->address,
                'date_of_birth' => optional($person->date_of_birth)->toDateString(),
                'age_years' => $age['years'],
                'age_months' => $age['months'],
                'owner_id' => $person->user_id,
                'owner_name' => optional($person->user)->name,
                'created_at' => optional($person->created_at)->toDateTimeString(),
                'updated_at' => optional($person->updated_at)->toDateTimeString(),
            ];
        })->values();

        return response()->json([
            'people' => $people,
        ]);
    });

    Route::put('/people/{person}', function (Request $request, Person $person) {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'nric' => [
                'required',
                'string',
                'max:255',
                Rule::unique('people', 'nric')->ignore($person->id),
            ],
            'date_of_birth' => ['nullable', 'date'],
            'gender' => ['nullable', 'string', 'max:50'],
            'blood_type' => ['nullable', 'string', 'max:10'],
            'occupation' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'array', 'max:4'],
            'phone.*' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);
        
        // Filter out empty phone numbers
        if (isset($data['phone']) && is_array($data['phone'])) {
            $data['phone'] = array_values(array_filter($data['phone'], fn($p) => !empty(trim($p ?? ''))));
            if (empty($data['phone'])) {
                $data['phone'] = null;
            }
        }

        if (isset($data['user_id'])) {
            $person->user_id = $data['user_id'];
            unset($data['user_id']);
        }

        $person->fill($data);
        $dirtyAttributes = $person->getDirty();
        $changeDetails = [];

        if (! empty($dirtyAttributes)) {
            $changeDetails = person_change_details($person, $dirtyAttributes);
            $person->save();
        }

        $person->refresh()->loadMissing('user');
        $age = $person->age_breakdown;

        if (! empty($changeDetails)) {
            // Log activity
            ActivityLogger::log(
                'admin.person_updated',
                __(':admin_name updated person: :person_name', [
                    'admin_name' => $request->user()->name,
                    'person_name' => $person->name,
                ]),
                $person,
                [
                    'via' => 'mobile_app',
                    'changes' => $changeDetails,
                ]
            );
        }

        return response()->json([
            'message' => 'Person updated successfully.',
            'person' => [
                'id' => $person->id,
                'name' => $person->name,
                'nric' => $person->nric,
                'email' => $person->email,
                'phone' => $person->phone,
                'gender' => $person->gender,
                'blood_type' => $person->blood_type,
                'occupation' => $person->occupation,
                'address' => $person->address,
                'date_of_birth' => optional($person->date_of_birth)->toDateString(),
                'age_years' => $age['years'],
                'age_months' => $age['months'],
                'owner_id' => $person->user_id,
                'owner_name' => optional($person->user)->name,
                'created_at' => optional($person->created_at)->toDateTimeString(),
                'updated_at' => optional($person->updated_at)->toDateTimeString(),
            ],
        ]);
    });

    Route::delete('/people/{person}', function (Request $request, Person $person) {
        $person->loadMissing('documents');
        $personName = $person->name;
        $personId = $person->id;

        foreach ($person->documents as $document) {
            Storage::disk('public')->delete($document->file_path);
            $document->delete();
        }

        $person->delete();

        // Log activity
        ActivityLogger::log(
            'admin.person_deleted',
            __(':admin_name deleted person: :person_name', [
                'admin_name' => $request->user()->name,
                'person_name' => $personName,
            ]),
            null,
            ['person_id' => $personId, 'via' => 'mobile_app']
        );

        return response()->json([
            'message' => 'Person deleted successfully.',
        ]);
    });

    // Documents Management
    Route::get('/documents', function (Request $request) {
        $search = $request->string('search')->toString();
        $personId = $request->integer('person_id', 0);
        $isPublic = $request->boolean('is_public', null);

        $documentsQuery = Document::query()
            ->with('person.user')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('original_name', 'like', "%{$search}%");
                });
            })
            ->when($personId > 0, function ($query) use ($personId) {
                $query->where('person_id', $personId);
            })
            ->when($isPublic !== null, function ($query) use ($isPublic) {
                $query->where('is_public', $isPublic);
            })
            ->latest();

        $documents = $documentsQuery->get()->map(function (Document $document) use ($request) {
            return array_merge(
                map_document_response($document, $request),
                [
                    'person_id' => $document->person_id,
                    'person_name' => optional($document->person)->name,
                    'owner_name' => optional(optional($document->person)->user)->name,
                ]
            );
        })->values();

        return response()->json([
            'documents' => $documents,
        ]);
    });

    Route::delete('/documents/{document}', function (Request $request, Document $document) {
        $documentName = $document->name;
        $documentId = $document->id;

        Storage::disk('public')->delete($document->file_path);
        $document->delete();

        // Log activity
        ActivityLogger::log(
            'admin.document_deleted',
            __(':admin_name deleted document ":doc_name"', [
                'admin_name' => $request->user()->name,
                'doc_name' => $documentName,
            ]),
            null,
            ['document_id' => $documentId, 'via' => 'mobile_app']
        );

        return response()->json([
            'message' => 'Document deleted successfully.',
        ]);
    });

    // Admin Statistics
    Route::get('/statistics', function (Request $request) {
        $totalUsers = User::count();
        $totalAdmins = User::where('is_admin', true)->count();
        $totalApprovedUsers = User::whereNotNull('approved_at')->count();
        $pendingUsers = User::whereNull('approved_at')->where('is_admin', false)->count();
        $totalPeople = Person::count();
        $totalDocuments = Document::count();
        $publicDocuments = Document::where('is_public', true)->count();
        $privateDocuments = Document::where('is_public', false)->count();

        $usersThisMonth = User::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();
        $peopleThisMonth = Person::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();
        $documentsThisMonth = Document::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        $topUsers = User::withCount('people')
            ->having('people_count', '>', 0)
            ->orderBy('people_count', 'desc')
            ->limit(10)
            ->get()
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'people_count' => $u->people_count,
            ]);

        $recentUsers = User::latest()
            ->limit(10)
            ->get()
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'is_admin' => $u->is_admin,
                'is_approved' => $u->isApproved(),
                'created_at' => optional($u->created_at)->toDateTimeString(),
            ]);

        return response()->json([
            'overview' => [
                'total_users' => $totalUsers,
                'total_admins' => $totalAdmins,
                'total_approved_users' => $totalApprovedUsers,
                'pending_users' => $pendingUsers,
                'total_people' => $totalPeople,
                'total_documents' => $totalDocuments,
                'public_documents' => $publicDocuments,
                'private_documents' => $privateDocuments,
                'users_this_month' => $usersThisMonth,
                'people_this_month' => $peopleThisMonth,
                'documents_this_month' => $documentsThisMonth,
            ],
            'top_users' => $topUsers,
            'recent_users' => $recentUsers,
        ]);
    });

    // Activity Log
    Route::get('/activity-logs', function (Request $request) {
        $perPage = $request->integer('per_page', 50);
        $page = $request->integer('page', 1);

        $logs = \App\Models\ActivityLog::with('user')
            ->orderByDesc('occurred_at')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'user_id' => $log->user_id,
                    'user_name' => optional($log->user)->name ?? 'System',
                    'action' => $log->action,
                    'description' => $log->description,
                    'subject_type' => $log->subject_type,
                    'subject_id' => $log->subject_id,
                    'properties' => $log->properties,
                    'ip_address' => $log->ip_address,
                    'occurred_at' => optional($log->occurred_at)->toDateTimeString(),
                    'created_at' => optional($log->created_at)->toDateTimeString(),
                ];
            })
            ->values();

        $total = \App\Models\ActivityLog::count();

        return response()->json([
            'logs' => $logs,
            'total' => $total,
            'per_page' => $perPage,
            'page' => $page,
            'has_more' => ($page * $perPage) < $total,
        ]);
    });

    Route::post('/events', function (Request $request) {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'event_date' => ['required', 'date'],
        ]);

        $event = \App\Models\Event::create($data);

        // Log activity
        ActivityLogger::log(
            'admin.event_created',
            __(':admin_name created event: :event_name', [
                'admin_name' => $request->user()->name,
                'event_name' => $event->name,
            ]),
            $event,
            ['via' => 'mobile_app']
        );

        $eventDate = \Carbon\Carbon::parse($event->event_date)->startOfDay();
        $now = now()->startOfDay();
        $daysUntil = (int) floor($now->diffInDays($eventDate, false));

        return response()->json([
            'message' => 'Event created successfully.',
            'event' => [
                'id' => $event->id,
                'name' => $event->name,
                'event_date' => $event->event_date->toDateString(),
                'days_until' => $daysUntil >= 0 ? $daysUntil : null,
                'is_past' => $daysUntil < 0,
                'created_at' => optional($event->created_at)->toDateTimeString(),
                'updated_at' => optional($event->updated_at)->toDateTimeString(),
            ],
        ], 201);
    });

    Route::put('/events/{event}', function (Request $request, \App\Models\Event $event) {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'event_date' => ['required', 'date'],
        ]);

        $event->update($data);

        // Log activity
        ActivityLogger::log(
            'admin.event_updated',
            __(':admin_name updated event: :event_name', [
                'admin_name' => $request->user()->name,
                'event_name' => $event->name,
            ]),
            $event,
            ['via' => 'mobile_app']
        );

        $eventDate = \Carbon\Carbon::parse($event->event_date)->startOfDay();
        $now = now()->startOfDay();
        $daysUntil = (int) floor($now->diffInDays($eventDate, false));

        return response()->json([
            'message' => 'Event updated successfully.',
            'event' => [
                'id' => $event->id,
                'name' => $event->name,
                'event_date' => $event->event_date->toDateString(),
                'days_until' => $daysUntil >= 0 ? $daysUntil : null,
                'is_past' => $daysUntil < 0,
                'created_at' => optional($event->created_at)->toDateTimeString(),
                'updated_at' => optional($event->updated_at)->toDateTimeString(),
            ],
        ]);
    });

    Route::delete('/events/{id}', function (Request $request, $id) {
        $event = \App\Models\Event::find($id);

        if (!$event) {
            return response()->json([
                'message' => 'Event not found.',
            ], 404);
        }

        $eventName = $event->name;
        $eventId = $event->id;

        $event->delete();

        // Log activity
        ActivityLogger::log(
            'admin.event_deleted',
            __(':admin_name deleted event: :event_name', [
                'admin_name' => $request->user()->name,
                'event_name' => $eventName,
            ]),
            null,
            ['event_id' => $eventId, 'via' => 'mobile_app']
        );

        return response()->json([
            'message' => 'Event deleted successfully.',
        ]);
    });
});
