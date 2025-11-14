<?php

use App\Models\Person;
use function Livewire\Volt\{computed, state};

state(['search' => '']);

$people = computed(function () {
    return Person::query()
        ->with('user')
        ->when($this->search, fn($query) => $query->where('name', 'like', "%{$this->search}%"))
        ->latest()
        ->get();
}); ?>

<div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-6">
    <div class="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 sm:px-6">
        <div class="flex items-center justify-between gap-3">
            <h1 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{{ __('All People') }}</h1>
            <flux:button href="{{ route('people.index') }}" variant="ghost" size="sm" class="text-sm sm:text-base">
                <span class="hidden sm:inline">{{ __('My People') }}</span>
                <span class="sm:hidden">{{ __('Mine') }}</span>
            </flux:button>
        </div>
    </div>

    <div class="px-4 sm:px-6 pt-4 sm:pt-6">
        <div class="mb-4 sm:mb-6">
            <div class="relative">
                <flux:input 
                    wire:model.live.debounce.300ms="search" 
                    :label="__('Search by Name')" 
                    type="text" 
                    placeholder="{{ __('Search...') }}"
                    class="text-base"
                />
                <div class="absolute right-3 top-9 text-neutral-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>
            </div>
        </div>

        @if ($this->people->isEmpty())
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 sm:p-12 text-center shadow-sm">
                <div class="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 sm:w-10 sm:h-10 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>
                <flux:heading size="lg" class="mb-2 text-neutral-900 dark:text-neutral-100">{{ __('No people found') }}</flux:heading>
                <flux:text class="text-neutral-500 dark:text-neutral-400 text-sm sm:text-base">
                    {{ $this->search ? __('Try a different search term') : __('No people in the system yet') }}
                </flux:text>
            </div>
        @else
            <div class="space-y-3 sm:space-y-4">
                @foreach ($this->people as $person)
                    <a href="{{ route('people.show', $person) }}" class="block group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 hover:shadow-md transition-all duration-200">
                        <div class="flex items-start gap-4">
                            <div class="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg">
                                {{ strtoupper(substr($person->name, 0, 1)) }}
                            </div>
                            <div class="flex-1 min-w-0">
                                <flux:heading size="base" class="font-bold text-neutral-900 dark:text-neutral-100 mb-1.5 truncate">
                                    {{ ucwords(strtolower($person->name)) }}
                                </flux:heading>
                                <div class="space-y-1.5">
                                    @if($person->email)
                                        <div class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                            </svg>
                                            <span class="truncate">{{ $person->email }}</span>
                                        </div>
                                    @endif
                                    @if($person->phone)
                                        <div class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                            </svg>
                                            <span>{{ $person->phone }}</span>
                                        </div>
                                    @endif
                                    <div class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 pt-1">
                                        <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                        </svg>
                                        <span>{{ __('Created by') }} {{ ucwords(strtolower($person->user->name)) }}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="flex-shrink-0">
                                <svg class="w-5 h-5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </div>
                        </div>
                    </a>
                @endforeach
            </div>
        @endif
    </div>
</div>
