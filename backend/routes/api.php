<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;


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


