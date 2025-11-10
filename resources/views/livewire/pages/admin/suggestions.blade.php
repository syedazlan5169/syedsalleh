<?php

use App\Models\Suggestion;
use Illuminate\Support\Facades\Auth;
use Livewire\Volt\Component;

new class extends Component {
    public function mount(): void
    {
        abort_unless(Auth::user()->isAdmin(), 403);
    }

    public function markAsRead(Suggestion $suggestion): void
    {
        abort_unless(Auth::user()->isAdmin(), 403);
        
        $suggestion->update(['is_read' => true]);
    }

    public function markAsUnread(Suggestion $suggestion): void
    {
        abort_unless(Auth::user()->isAdmin(), 403);
        
        $suggestion->update(['is_read' => false]);
    }

    public function deleteSuggestion(Suggestion $suggestion): void
    {
        abort_unless(Auth::user()->isAdmin(), 403);
        
        $suggestion->delete();
    }
}; ?>

<div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-6">
    <div class="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 sm:px-6">
        <div class="flex items-center justify-between">
            <h1 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{{ __('User Suggestions') }}</h1>
            <flux:button href="{{ route('dashboard') }}" variant="ghost" size="sm" class="text-sm sm:text-base">
                {{ __('Back') }}
            </flux:button>
        </div>
    </div>

    <div class="px-4 sm:px-6 pt-4 sm:pt-6">
        @php
            $suggestions = Suggestion::with('user')->latest()->get();
        @endphp

        @if ($suggestions->isEmpty())
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 sm:p-12 text-center shadow-sm">
                <div class="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 sm:w-10 sm:h-10 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                </div>
                <flux:heading size="lg" class="mb-2 text-neutral-900 dark:text-neutral-100">{{ __('No suggestions yet') }}</flux:heading>
                <flux:text class="text-neutral-500 dark:text-neutral-400 text-sm sm:text-base">
                    {{ __('No user suggestions have been submitted yet.') }}
                </flux:text>
            </div>
        @else
            <div class="space-y-3 sm:space-y-4">
                @foreach ($suggestions as $suggestion)
                    <div class="rounded-2xl border {{ $suggestion->is_read ? 'border-neutral-200 dark:border-neutral-800' : 'border-blue-300 dark:border-blue-700' }} bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm {{ $suggestion->is_read ? '' : 'ring-2 ring-blue-500/20' }}">
                        <div class="flex items-start gap-4">
                            <div class="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg">
                                {{ strtoupper(substr($suggestion->user->name, 0, 1)) }}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between gap-3 mb-2">
                                    <div class="flex-1 min-w-0">
                                        <flux:heading size="base" class="font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                                            {{ ucwords(strtolower($suggestion->subject)) }}
                                        </flux:heading>
                                        <div class="flex items-center gap-2 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                                            <span>{{ ucwords(strtolower($suggestion->user->name)) }}</span>
                                            <span>•</span>
                                            <span>{{ $suggestion->created_at->diffForHumans() }}</span>
                                            @if (!$suggestion->is_read)
                                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {{ __('New') }}
                                                </span>
                                            @endif
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-3 p-3 sm:p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                                    <flux:text class="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                                        {{ $suggestion->message }}
                                    </flux:text>
                                </div>
                                <div class="flex items-center gap-2 mt-4 flex-wrap">
                                    @if ($suggestion->is_read)
                                        <flux:button wire:click="markAsUnread({{ $suggestion->id }})" variant="ghost" size="sm" class="text-xs sm:text-sm">
                                            {{ __('Mark as Unread') }}
                                        </flux:button>
                                    @else
                                        <flux:button wire:click="markAsRead({{ $suggestion->id }})" variant="primary" size="sm" class="text-xs sm:text-sm">
                                            {{ __('Mark as Read') }}
                                        </flux:button>
                                    @endif
                                    <flux:button wire:click="deleteSuggestion({{ $suggestion->id }})" 
                                        wire:confirm="{{ __('Are you sure you want to delete this suggestion?') }}"
                                        variant="ghost" 
                                        size="sm"
                                        class="text-xs sm:text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                                        {{ __('Delete') }}
                                    </flux:button>
                                </div>
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>
        @endif
    </div>
</div>
