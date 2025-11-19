<?php

use App\Models\User;
use App\Models\Person;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\Rule;


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

    Route::get('/people/{person}', function (Person $person) {
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
            ],
        ]);
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




