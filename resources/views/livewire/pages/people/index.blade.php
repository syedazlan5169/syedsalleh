<?php

use App\Models\Person;
use App\Support\ActivityLogger;
use Illuminate\Support\Facades\Auth;
use Livewire\Volt\Component;

new class extends Component {
    public function delete(Person $person): void
    {
        ActivityLogger::log(
            'person.deleted',
            __('Deleted person :name', ['name' => $person->name]),
            $person
        );

        $person->delete();
    }
}; ?>

<div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-6">
    <div class="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 sm:px-6">
        <div class="flex items-center justify-between">
            <h1 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{{ __('My People') }}</h1>
            <flux:button href="{{ route('people.create') }}" variant="primary" size="sm" class="text-sm sm:text-base">
                <span class="hidden sm:inline">{{ __('Add Person') }}</span>
                <span class="sm:hidden">+</span>
            </flux:button>
        </div>
    </div>

    <div class="px-4 sm:px-6 pt-4 sm:pt-6">
        @if (Auth::user()->people->isEmpty())
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 sm:p-12 text-center shadow-sm">
                <div class="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 sm:w-10 sm:h-10 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                </div>
                <flux:heading size="lg" class="mb-2 text-neutral-900 dark:text-neutral-100">{{ __('No people added yet') }}</flux:heading>
                <flux:text class="text-neutral-500 dark:text-neutral-400 mb-6 text-sm sm:text-base">
                    {{ __('Get started by adding your first family member') }}
                </flux:text>
                <flux:button href="{{ route('people.create') }}" variant="primary" class="w-full sm:w-auto">
                    {{ __('Add Your First Person') }}
                </flux:button>
            </div>
        @else
            <div class="space-y-3 sm:space-y-4">
                @foreach (Auth::user()->people as $person)
                    <div class="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                        <a href="{{ route('people.show', $person) }}" class="block p-4 sm:p-6">
                            <div class="flex items-start justify-between gap-4">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-3 mb-2">
                                        <div class="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg">
                                            {{ strtoupper(substr($person->name, 0, 1)) }}
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <flux:heading size="base" class="font-bold text-neutral-900 dark:text-neutral-100 truncate">
                                                {{ $person->name }}
                                            </flux:heading>
                                            <flux:text class="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                {{ $person->nric }}
                                            </flux:text>
                                        </div>
                                    </div>
                                    <div class="mt-3 space-y-1.5 pl-16 sm:pl-20">
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
                                    </div>
                                </div>
                            </div>
                        </a>
                        <div class="border-t border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-3 flex items-center justify-end gap-2 bg-neutral-50 dark:bg-neutral-800/50">
                            <flux:button href="{{ route('people.edit', $person) }}" variant="ghost" size="sm" class="text-sm">
                                {{ __('Edit') }}
                            </flux:button>
                            <flux:button wire:click="delete({{ $person->id }})" 
                                wire:confirm="{{ __('Are you sure you want to delete this person?') }}"
                                variant="ghost" 
                                size="sm"
                                class="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                                {{ __('Delete') }}
                            </flux:button>
                        </div>
                    </div>
                @endforeach
            </div>
        @endif
    </div>
</div>
