<?php

use App\Http\Requests\StoreDocumentRequest;
use App\Models\DeviceToken;
use App\Models\Document;
use App\Models\Notification;
use App\Models\User;
use App\Models\Person;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
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
            \Log::error('Push notification error: '.$e->getMessage());

            return null;
        }
    }
}


Route::get('/ping', function () {
    return response()->json([
        'message' => 'pong from Laravel API',
        'time'    => now()->toDateTimeString(),
    ]);
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

    $token = $user->createToken('mobile')->plainTextToken;

    return response()->json([
        'token' => $token,
        'user'  => [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
        ],
    ]);
});

Route::middleware('auth:sanctum')->group(function () {
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

        // My people (owned by current user)
        $myPeople = $user->people()
            ->orderBy('name')
            ->get()
            ->map(function (Person $person) {
                $age = $person->age_breakdown;

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
                ];
            })
            ->values();

        $myPeopleCount  = $myPeople->count();
        $allPeopleCount = Person::count();

        return response()->json([
            'user' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ],
            'stats' => [
                'my_people_count'  => $myPeopleCount,
                'all_people_count' => $allPeopleCount,
            ],
            'upcoming_birthdays' => $upcomingBirthdays,
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
            'email' => ['required', 'email', 'max:255', \Illuminate\Validation\Rule::unique('users')->ignore($user->id)],
        ]);

        $user->update($data);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
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

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    });

    Route::get('/chat/messages', function (Request $request) {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $messages = \App\Models\Message::with('user:id,name,email')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($message) use ($user) {
                return [
                    'id' => $message->id,
                    'user_id' => $message->user_id,
                    'user_name' => $message->user->name,
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

        $message->load('user:id,name,email');

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
                "{$user->name}: {$messagePreview}",
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
                'user_name' => $message->user->name,
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

        if (! $user || ($user->id !== $person->user_id && ! $user->isAdmin())) {
            $documentsQuery->where('is_public', true);
        }

        $documents = $documentsQuery
            ->get()
            ->map(fn (Document $document) => map_document_response($document, $request))
            ->values();

        $canManageDocuments = $user && ($user->id === $person->user_id || $user->isAdmin());

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
            'phone'         => ['nullable', 'string', 'max:255'],
            'email'         => ['nullable', 'email', 'max:255'],
        ]);

        $person = $user->people()->create($data);
        $person->loadMissing('user');
        $age = $person->age_breakdown;

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
            'phone'         => ['nullable', 'string', 'max:255'],
            'email'         => ['nullable', 'email', 'max:255'],
        ]);

        $person->update($data);
        $person->loadMissing('user');
        $age = $person->age_breakdown;

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

        if ($person->user_id !== $user->id && ! $user->isAdmin()) {
            return response()->json([
                'message' => 'You are not allowed to delete this person.',
            ], 403);
        }

        $person->loadMissing('documents');

        foreach ($person->documents as $document) {
            Storage::disk('public')->delete($document->file_path);
            $document->delete();
        }

        $person->delete();

        return response()->noContent();
    });

    Route::get('/people/{person}/documents', function (Request $request, Person $person) {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        $documentsQuery = $person->documents()->latest();

        if (! $user || ($user->id !== $person->user_id && ! $user->isAdmin())) {
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

        if (! $user || ($user->id !== $person->user_id && ! $user->isAdmin())) {
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

        return response()->json([
            'document' => map_document_response($document, $request),
        ], 201);
    });

    Route::patch('/documents/{document}', function (Request $request, Document $document) {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        $document->loadMissing('person.user');

        if (! $user || ($document->person->user_id !== $user->id && ! $user->isAdmin())) {
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

        return response()->json([
            'document' => map_document_response($document, $request),
        ]);
    });

    Route::delete('/documents/{document}', function (Request $request, Document $document) {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        $document->loadMissing('person.user');

        if (! $user || ($document->person->user_id !== $user->id && ! $user->isAdmin())) {
            return response()->json([
                'message' => 'You are not allowed to delete this document.',
            ], 403);
        }

        Storage::disk('public')->delete($document->file_path);
        $document->delete();

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
});

Route::get('/people', function (Request $request) {
    $search = $request->string('search')->toString();

    $peopleQuery = Person::query()
        ->with('user')
        ->when($search, function ($query, $search) {
            $query->where('name', 'like', "%{$search}%");
        })
        ->latest();

    $people = $peopleQuery->get()->map(function (Person $person) {
        $age = $person->age_breakdown;

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
        ];
    })->values();

    return response()->json([
        'people' => $people,
    ]);
});




