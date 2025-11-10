<?php

use App\Models\Person;
use Illuminate\Support\Facades\Auth;
use function Livewire\Volt\{computed};

$upcomingBirthdays = computed(function () {
    return Person::query()
        ->upcomingBirthdays(30)
        ->with('user')
        ->get()
        ->map(function ($person) {
            $person->days_until = $person->days_until_birthday;
            $person->next_birthday_date = $person->next_birthday;
            return $person;
        })
        ->sortBy('days_until')
        ->take(10); // Show up to 10 upcoming birthdays
}); ?>

<div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-6">
    <div class="px-4 sm:px-6 pt-4 sm:pt-6 pb-4">
        <h1 class="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">{{ __('Dashboard') }}</h1>
        <p class="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">{{ __('Welcome back! Manage your family members and documents.') }}</p>
    </div>
    
    <div class="px-4 sm:px-6">
        <!-- Upcoming Birthdays Announcement -->
        @if ($this->upcomingBirthdays->isNotEmpty())
            <div class="mb-6 sm:mb-8 rounded-2xl border border-pink-200 dark:border-pink-800 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 p-4 sm:p-6 shadow-sm">
                <div class="flex items-center gap-3 mb-4">
                    <div class="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
                        <svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2v2m0 0v5m0-5h-2m2 5h2m-6 3a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3a2 2 0 012 2v1.382a1 1 0 01-.553.894l-1.618.81a2 2 0 01-1.106.276H15v-5zM9 11H6a2 2 0 00-2 2v1.382a1 1 0 00.553.894l1.618.81a2 2 0 001.106.276H9v-5z"></path>
                        </svg>
                    </div>
                    <div>
                        <flux:heading size="lg" class="text-neutral-900 dark:text-neutral-100">{{ __('Upcoming Birthdays') }}</flux:heading>
                        <flux:text class="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                            {{ __('Next 30 days') }}
                        </flux:text>
                    </div>
                </div>
                
                <div class="space-y-2 sm:space-y-3">
                    @foreach ($this->upcomingBirthdays as $person)
                        <a href="{{ route('people.show', $person) }}" wire:navigate class="block group rounded-xl border border-pink-200 dark:border-pink-800 bg-white dark:bg-neutral-900 p-3 sm:p-4 hover:shadow-md transition-all duration-200">
                            <div class="flex items-center gap-3 sm:gap-4">
                                <div class="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg">
                                    {{ strtoupper(substr($person->name, 0, 1)) }}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <flux:heading size="base" class="font-bold text-neutral-900 dark:text-neutral-100 mb-1 truncate">
                                        {{ ucwords(strtolower($person->name)) }}
                                    </flux:heading>
                                    <div class="flex items-center gap-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                                        <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        <span>
                                            @if($person->days_until == 0)
                                                {{ __('Today!') }}
                                            @elseif($person->days_until == 1)
                                                {{ __('Tomorrow') }}
                                            @else
                                                {{ $person->next_birthday_date->format('F d') }} ({{ __('in :days days', ['days' => $person->days_until]) }})
                                            @endif
                                        </span>
                                    </div>
                                </div>
                                <div class="flex-shrink-0">
                                    <svg class="w-5 h-5 text-neutral-400 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                    </svg>
                                </div>
                            </div>
                        </a>
                    @endforeach
                </div>
            </div>
        @endif

        <div class="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <a href="{{ route('people.index') }}" wire:navigate class="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700">
                <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-full -mr-16 -mt-16"></div>
                <div class="relative">
                    <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg">
                        <svg class="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                    </div>
                    <flux:heading size="lg" class="mb-2 text-neutral-900 dark:text-neutral-100">{{ __('My People') }}</flux:heading>
                    <flux:text class="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                        {{ __('Manage your family members') }}
                    </flux:text>
                </div>
            </a>

            <a href="{{ route('people.all') }}" wire:navigate class="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 hover:shadow-lg transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-700">
                <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-600/10 rounded-full -mr-16 -mt-16"></div>
                <div class="relative">
                    <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
                        <svg class="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    <flux:heading size="lg" class="mb-2 text-neutral-900 dark:text-neutral-100">{{ __('All People') }}</flux:heading>
                    <flux:text class="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                        {{ __('Browse all people in the system') }}
                    </flux:text>
                </div>
            </a>

            <a href="{{ route('people.create') }}" wire:navigate class="group relative overflow-hidden rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 sm:p-8 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-200 sm:col-span-2 lg:col-span-1">
                <div class="relative text-center">
                    <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-4 mx-auto shadow-lg">
                        <svg class="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                    </div>
                    <flux:heading size="lg" class="mb-2 text-neutral-900 dark:text-neutral-100">{{ __('Add Person') }}</flux:heading>
                    <flux:text class="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                        {{ __('Add a new family member') }}
                    </flux:text>
                </div>
            </a>
        </div>

        <!-- Suggestion Box -->
        <div class="mt-6 sm:mt-8">
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                <div class="flex items-start gap-4">
                    <div class="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg">
                        <svg class="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                        </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                        <flux:heading size="lg" class="mb-2 text-neutral-900 dark:text-neutral-100">{{ __('Suggestion Box') }}</flux:heading>
                        <flux:text class="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mb-4">
                            {{ __('Have an idea to improve the application? Share your suggestions with us!') }}
                        </flux:text>
                        <flux:button href="{{ route('suggestions.create') }}" variant="primary" size="sm" wire:navigate class="text-sm sm:text-base">
                            {{ __('Submit a Suggestion') }}
                        </flux:button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
