<?php

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;
use Livewire\Volt\Component;

new class extends Component
{
    public int $perPage = 50;

    public function mount(): void
    {
        abort_unless(Auth::user()?->isAdmin(), 403);
    }

    public function loadMore(): void
    {
        $this->perPage += 50;
    }

    public function getLogsProperty()
    {
        return ActivityLog::with('user')
            ->orderByDesc('occurred_at')
            ->limit($this->perPage)
            ->get();
    }
}; ?>

<div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-6">
    <div class="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 sm:px-6">
        <div class="flex items-center justify-between gap-3">
            <h1 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{{ __('Activity Log') }}</h1>
            <flux:button href="{{ route('admin.dashboard') }}" variant="ghost" size="sm" class="text-sm sm:text-base">
                {{ __('Back to Admin') }}
            </flux:button>
        </div>
    </div>

    <div class="px-4 sm:px-6 pt-4 sm:pt-6">
        <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
            <div class="px-4 sm:px-6 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <flux:text class="text-sm text-neutral-600 dark:text-neutral-400">
                    {{ __('Showing latest :count activities', ['count' => $this->logs->count()]) }}
                </flux:text>
                <flux:button wire:click="loadMore" variant="ghost" size="sm" class="text-sm" :disabled="$this->logs->count() < $this->perPage">
                    {{ __('Load more') }}
                </flux:button>
            </div>

            <div class="divide-y divide-neutral-200 dark:divide-neutral-800">
                @forelse ($this->logs as $log)
                    <div class="px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-2">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <div class="inline-flex items-center gap-2">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                        {{ Str::headline(Str::after($log->action, '.')) }}
                                    </span>
                                    <flux:text class="text-xs text-neutral-500 dark:text-neutral-400">
                                        {{ $log->occurred_at->diffForHumans() }}
                                    </flux:text>
                                </div>
                                <flux:text class="text-sm sm:text-base text-neutral-800 dark:text-neutral-200 mt-2">
                                    {{ $log->description }}
                                </flux:text>
                            </div>
                            <div class="text-right">
                                <flux:text class="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                    {{ __('User') }}
                                </flux:text>
                                <flux:text class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                    {{ $log->user->name ?? __('System') }}
                                </flux:text>
                                @if($log->ip_address)
                                    <flux:text class="text-xs text-neutral-500 dark:text-neutral-400">
                                        {{ $log->ip_address }}
                                    </flux:text>
                                @endif
                            </div>
                        </div>

                        <div class="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            @if($log->subject_type && $log->subject_id)
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h18M3 12h18M3 17h18"></path>
                                    </svg>
                                    {{ class_basename($log->subject_type) }} #{{ $log->subject_id }}
                                </span>
                            @endif
                            @if(!empty($log->properties))
                                <details class="group">
                                    <summary class="cursor-pointer select-none inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"></path>
                                        </svg>
                                        {{ __('Details') }}
                                    </summary>
                                    <pre class="mt-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 p-3 rounded text-xs overflow-auto max-w-full">{{ json_encode($log->properties, JSON_PRETTY_PRINT) }}</pre>
                                </details>
                            @endif
                        </div>
                    </div>
                @empty
                    <div class="px-4 sm:px-6 py-12 text-center">
                        <div class="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                            <svg class="w-8 h-8 sm:w-10 sm:h-10 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                            </svg>
                        </div>
                        <flux:heading size="lg" class="mb-2 text-neutral-900 dark:text-neutral-100">{{ __('No activity yet') }}</flux:heading>
                        <flux:text class="text-neutral-500 dark:text-neutral-400 text-sm sm:text-base">
                            {{ __('Once users start interacting with the application, their actions will appear here.') }}
                        </flux:text>
                    </div>
                @endforelse
            </div>
        </div>
    </div>
</div>
