<?php

use App\Models\Person;
use Illuminate\Support\Facades\Auth;
use Livewire\Volt\Component;

new class extends Component {
    public function delete(Person $person): void
    {
        $person->delete();
    }
}; ?>

<div class="flex h-full w-full flex-1 flex-col gap-4">
        <div class="flex items-center justify-between">
            <h1 class="text-2xl font-bold">{{ __('My People') }}</h1>
            <flux:button href="{{ route('people.create') }}" variant="primary">
                {{ __('Add Person') }}
            </flux:button>
        </div>

        <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            @if (Auth::user()->people->isEmpty())
                <div class="p-8 text-center">
                    <flux:text class="text-neutral-500 dark:text-neutral-400">
                        {{ __('No people added yet.') }}
                    </flux:text>
                </div>
            @else
                <div class="divide-y divide-neutral-200 dark:divide-neutral-700">
                    @foreach (Auth::user()->people as $person)
                        <div class="flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                            <div class="flex-1">
                                <a href="{{ route('people.show', $person) }}" class="block">
                                    <flux:heading size="sm" class="font-semibold">
                                        {{ $person->name }}
                                    </flux:heading>
                                    <flux:text class="text-sm text-neutral-500 dark:text-neutral-400">
                                        {{ $person->email }} • {{ $person->phone }}
                                    </flux:text>
                                </a>
                            </div>
                            <div class="flex items-center gap-2">
                                <flux:button href="{{ route('people.edit', $person) }}" variant="ghost" size="sm">
                                    {{ __('Edit') }}
                                </flux:button>
                                <flux:button wire:click="delete({{ $person->id }})" 
                                    wire:confirm="{{ __('Are you sure you want to delete this person?') }}"
                                    variant="ghost" 
                                    size="sm"
                                    class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                                    {{ __('Delete') }}
                                </flux:button>
                            </div>
                        </div>
                    @endforeach
                </div>
            @endif
        </div>
    </div>
</div>
