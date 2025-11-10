<?php

use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;
use Livewire\Volt\Volt;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Volt::route('dashboard', 'pages.dashboard')
    ->middleware(['auth', 'verified', 'approved'])
    ->name('dashboard');

Route::middleware(['auth', 'approved'])->group(function () {
    Route::redirect('settings', 'settings/profile');

    Volt::route('settings/profile', 'settings.profile')->name('profile.edit');
    Volt::route('settings/password', 'settings.password')->name('user-password.edit');
    Volt::route('settings/appearance', 'settings.appearance')->name('appearance.edit');

    Volt::route('settings/two-factor', 'settings.two-factor')
        ->middleware(
            when(
                Features::canManageTwoFactorAuthentication()
                    && Features::optionEnabled(Features::twoFactorAuthentication(), 'confirmPassword'),
                ['password.confirm'],
                [],
            ),
        )
        ->name('two-factor.show');

    // People routes
    Volt::route('people', 'pages.people.index')->name('people.index');
    Volt::route('people/create', 'pages.people.create')->name('people.create');
    Volt::route('people/{person}/edit', 'pages.people.edit')->name('people.edit');
    Volt::route('people/{person}', 'pages.people.show')->name('people.show');
    Volt::route('people-all', 'pages.people.all')->name('people.all');

    // Suggestions routes
    Volt::route('suggestions/create', 'pages.suggestions.create')->name('suggestions.create');

    // Statistics route
    Volt::route('statistics', 'pages.statistics')->name('statistics');
});

// Approval pending page (accessible without approval)
Route::middleware(['auth'])->group(function () {
    Volt::route('approval/pending', 'pages.approval.pending')->name('approval.pending');
});

// Admin routes (only for admins)
Route::middleware(['auth', 'approved'])->group(function () {
    Volt::route('admin/users', 'pages.admin.users')->name('admin.users');
    Volt::route('admin/suggestions', 'pages.admin.suggestions')->name('admin.suggestions');
});
