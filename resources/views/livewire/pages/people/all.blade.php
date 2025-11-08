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

<div class="flex h-full w-full flex-1 flex-col gap-4">
        <div class="flex items-center justify-between">
            <h1 class="text-2xl font-bold">{{ __('All People') }}</h1>
            <flux:button href="{{ route('people.index') }}" variant="ghost">
                {{ __('My People') }}
            </flux:button>
        </div>

        <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
            <flux:input 
                wire:model.live.debounce.300ms="search" 
                :label="__('Search by Name')" 
                type="text" 
                placeholder="{{ __('Search...') }}" 
            />
        </div>

        <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            @if ($this->people->isEmpty())
                <div class="p-8 text-center">
                    <flux:text class="text-neutral-500 dark:text-neutral-400">
                        {{ __('No people found.') }}
                    </flux:text>
                </div>
            @else
                <div class="divide-y divide-neutral-200 dark:divide-neutral-700">
                    @foreach ($this->people as $person)
                        <a href="{{ route('people.show', $person) }}" class="block p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                            <flux:heading size="sm" class="font-semibold">
                                {{ $person->name }}
                            </flux:heading>
                            <flux:text class="text-sm text-neutral-500 dark:text-neutral-400">
                                {{ $person->email }} • {{ $person->phone }}
                            </flux:text>
                            <flux:text class="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                                {{ __('Created by') }} {{ $person->user->name }}
                            </flux:text>
                        </a>
                    @endforeach
                </div>
            @endif
        </div>
    </div>
</div>
