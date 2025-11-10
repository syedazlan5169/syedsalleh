<?php

use App\Models\Suggestion;
use Illuminate\Support\Facades\Auth;
use Livewire\Volt\Component;

new class extends Component {
    public string $subject = '';
    public string $message = '';

    public function store(): void
    {
        $validated = $this->validate([
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        Auth::user()->suggestions()->create($validated);

        $this->subject = '';
        $this->message = '';

        session()->flash('suggestion-success', __('Thank you for your suggestion! We appreciate your feedback.'));
    }
}; ?>

<div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-6">
    <div class="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 sm:px-6">
        <div class="flex items-center justify-between">
            <h1 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{{ __('Suggestion Box') }}</h1>
            <flux:button href="{{ route('dashboard') }}" variant="ghost" size="sm" class="text-sm sm:text-base">
                {{ __('Back') }}
            </flux:button>
        </div>
    </div>

    <div class="px-4 sm:px-6 pt-4 sm:pt-6">
        <div class="max-w-2xl mx-auto">
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                <div class="mb-6">
                    <div class="flex items-center gap-3 mb-2">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                            </svg>
                        </div>
                        <flux:heading size="lg" class="text-neutral-900 dark:text-neutral-100">{{ __('Share Your Ideas') }}</flux:heading>
                    </div>
                    <flux:text class="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                        {{ __('We value your feedback! Please share any suggestions or ideas to help us improve the application.') }}
                    </flux:text>
                </div>

                @if (session('suggestion-success'))
                    <div class="mb-6 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                        <div class="flex items-start gap-3">
                            <svg class="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <flux:text class="text-sm text-green-800 dark:text-green-300">{{ session('suggestion-success') }}</flux:text>
                        </div>
                    </div>
                @endif

                <form wire:submit="store" class="space-y-4 sm:space-y-6">
                    <flux:input 
                        wire:model="subject" 
                        :label="__('Subject')" 
                        type="text" 
                        required 
                        placeholder="{{ __('Brief summary of your suggestion') }}"
                        class="text-base"
                    />

                    <flux:textarea 
                        wire:model="message" 
                        :label="__('Message')" 
                        required 
                        rows="6"
                        placeholder="{{ __('Please describe your suggestion in detail...') }}"
                        class="text-base"
                    />

                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                        <flux:button type="button" variant="ghost" href="{{ route('dashboard') }}" wire:navigate class="w-full sm:w-auto text-sm sm:text-base">
                            {{ __('Cancel') }}
                        </flux:button>
                        <flux:button type="submit" variant="primary" class="w-full sm:w-auto text-sm sm:text-base">
                            {{ __('Submit Suggestion') }}
                        </flux:button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
