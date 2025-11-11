<?php

use App\Models\Document;
use App\Models\Person;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Livewire\Volt\Component;
use Livewire\WithFileUploads;

new class extends Component {
    use WithFileUploads;

    public Person $person;
    public $file = null;
    public string $document_name = '';
    public bool $is_public = false;

    public function mount(Person $person): void
    {
        $this->person = $person->load('documents');
    }

    public function uploadDocument(): void
    {
        $validated = $this->validate([
            'document_name' => ['required', 'string', 'max:255'],
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,gif,webp'],
            'is_public' => ['boolean'],
        ]);

        $path = $this->file->store('documents', 'public');

        $this->person->documents()->create([
            'name' => $validated['document_name'],
            'file_path' => $path,
            'original_name' => $this->file->getClientOriginalName(),
            'file_size' => $this->file->getSize(),
            'mime_type' => $this->file->getMimeType(),
            'is_public' => $validated['is_public'] ?? false,
        ]);

        $this->file = null;
        $this->document_name = '';
        $this->is_public = false;
        
        $this->person->refresh();
    }

    public function toggleDocumentVisibility(Document $document): void
    {
        abort_unless($document->person->user_id === Auth::id(), 403);
        
        $document->update(['is_public' => !$document->is_public]);
        $this->person->refresh();
    }

    public function deleteDocument(Document $document): void
    {
        abort_unless($document->person->user_id === Auth::id(), 403);
        
        Storage::disk('public')->delete($document->file_path);
        $document->delete();
        $this->person->refresh();
    }

    public function downloadDocument(Document $document)
    {
        $user = Auth::user();
        
        // Allow if document is public, user owns the person, or user is admin
        if (!$document->is_public && $document->person->user_id !== $user->id && !$user->isAdmin()) {
            abort(403);
        }

        return Storage::disk('public')->download($document->file_path, $document->original_name ?? $document->name);
    }
}; ?>

<div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-6">
    <div class="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 sm:px-6">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl">
                    {{ strtoupper(substr($person->name, 0, 1)) }}
                </div>
                <h1 class="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 truncate">{{ ucwords(strtolower($person->name)) }}</h1>
            </div>
            @if ($person->user_id === Auth::id())
                <flux:button href="{{ route('people.edit', $person) }}" variant="ghost" size="sm" class="text-sm sm:text-base">
                    {{ __('Edit') }}
                </flux:button>
            @endif
        </div>
    </div>

    <div class="px-4 sm:px-6 pt-4 sm:pt-6">
        <div class="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <!-- Personal Information -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                <flux:heading size="lg" class="mb-4 sm:mb-6 text-neutral-900 dark:text-neutral-100">{{ __('Personal Information') }}</flux:heading>
                <div class="space-y-4 sm:space-y-5">
                    <div class="pb-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0 last:pb-0">
                        <flux:text class="text-xs sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">{{ __('NRIC') }}</flux:text>
                        <flux:text class="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 font-medium">{{ $person->nric }}</flux:text>
                    </div>
                    <div class="pb-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0 last:pb-0">
                        <flux:text class="text-xs sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">{{ __('Date of Birth') }}</flux:text>
                        <flux:text class="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 font-medium">{{ $person->date_of_birth->format('F d, Y') }}</flux:text>
                    </div>
                    <div class="pb-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0 last:pb-0">
                        <flux:text class="text-xs sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">{{ __('Gender') }}</flux:text>
                        <flux:text class="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 font-medium">{{ ucwords(strtolower($person->gender)) }}</flux:text>
                    </div>
                    @php($ageBreakdown = $person->age_breakdown)
                    @if(!is_null($ageBreakdown['years']))
                        <div class="pb-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0 last:pb-0">
                            <flux:text class="text-xs sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">{{ __('Age') }}</flux:text>
                            <flux:text class="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 font-medium">
                                {{ $ageBreakdown['years'] }}
                                {{ $ageBreakdown['years'] === 1 ? __('year') : __('years') }}
                                @if($ageBreakdown['months'] > 0)
                                    {{ __('and') }}
                                    {{ $ageBreakdown['months'] }}
                                    {{ $ageBreakdown['months'] === 1 ? __('month') : __('months') }}
                                @endif
                            </flux:text>
                        </div>
                    @endif
                    @if($person->blood_type)
                        <div class="pb-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0 last:pb-0">
                            <flux:text class="text-xs sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">{{ __('Blood Type') }}</flux:text>
                            <flux:text class="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 font-medium">{{ strtoupper($person->blood_type) }}</flux:text>
                        </div>
                    @endif
                    @if($person->occupation)
                        <div class="pb-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0 last:pb-0">
                            <flux:text class="text-xs sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">{{ __('Occupation') }}</flux:text>
                            <flux:text class="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 font-medium">{{ ucwords(strtolower($person->occupation)) }}</flux:text>
                        </div>
                    @endif
                    @if($person->address)
                        <div class="pb-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0 last:pb-0">
                            <flux:text class="text-xs sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">{{ __('Address') }}</flux:text>
                            <flux:text class="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 font-medium">{{ ucwords(strtolower($person->address)) }}</flux:text>
                        </div>
                    @endif
                    @if($person->phone)
                        <div class="pb-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0 last:pb-0">
                            <flux:text class="text-xs sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">{{ __('Phone') }}</flux:text>
                            <flux:text class="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 font-medium">{{ $person->phone }}</flux:text>
                        </div>
                    @endif
                    @if($person->email)
                        <div class="pb-4 border-b border-neutral-100 dark:border-neutral-800 last:border-0 last:pb-0">
                            <flux:text class="text-xs sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">{{ __('Email') }}</flux:text>
                            <flux:text class="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 font-medium break-all">{{ $person->email }}</flux:text>
                        </div>
                    @endif
                </div>
            </div>

            <!-- Documents -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-6 shadow-sm">
                <flux:heading size="lg" class="mb-4 sm:mb-6 text-neutral-900 dark:text-neutral-100">{{ __('Documents') }}</flux:heading>
                
                @if ($person->user_id === Auth::id())
                    <form wire:submit="uploadDocument" class="mb-6 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-4 sm:p-5 space-y-4">
                        <flux:input wire:model="document_name" :label="__('Document Name')" type="text" required class="text-base" />
                        <flux:input wire:model="file" :label="__('File')" type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" required class="text-base" />
                        <flux:checkbox wire:model="is_public" :label="__('Make Public')" />
                        <flux:button type="submit" variant="primary" size="sm" class="w-full sm:w-auto text-sm sm:text-base">
                            {{ __('Upload') }}
                        </flux:button>
                    </form>
                @endif

                <div class="space-y-2 sm:space-y-3">
                    @forelse ($person->documents as $document)
                        @if ($document->is_public || $person->user_id === Auth::id() || Auth::user()->isAdmin())
                            <div class="group rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 sm:p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                                <div class="flex items-start justify-between gap-3">
                                    <div class="flex items-start gap-3 flex-1 min-w-0">
                                        <div class="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                                            @if(str_starts_with($document->mime_type ?? '', 'image/'))
                                                <svg class="w-5 h-5 sm:w-6 sm:h-6 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                </svg>
                                            @else
                                                <svg class="w-5 h-5 sm:w-6 sm:h-6 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                                </svg>
                                            @endif
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <flux:text class="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate block">{{ ucwords(strtolower($document->name)) }}</flux:text>
                                            <div class="flex items-center gap-2 mt-1">
                                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {{ $document->is_public ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400' }}">
                                                    {{ $document->is_public ? __('Public') : __('Private') }}
                                                </span>
                                                @if (!$document->is_public && Auth::user()->isAdmin() && $person->user_id !== Auth::id())
                                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                        {{ __('Admin View') }}
                                                    </span>
                                                @endif
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                        <flux:button wire:click="downloadDocument({{ $document->id }})" variant="ghost" size="sm" class="text-xs sm:text-sm p-2">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                            </svg>
                                        </flux:button>
                                        @if ($person->user_id === Auth::id())
                                            <flux:button wire:click="toggleDocumentVisibility({{ $document->id }})" variant="ghost" size="sm" class="text-xs sm:text-sm p-2">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                                </svg>
                                            </flux:button>
                                            <flux:button wire:click="deleteDocument({{ $document->id }})" 
                                                wire:confirm="{{ __('Are you sure you want to delete this document?') }}"
                                                variant="ghost" 
                                                size="sm"
                                                class="text-xs sm:text-sm p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                </svg>
                                            </flux:button>
                                        @endif
                                    </div>
                                </div>
                            </div>
                        @endif
                    @empty
                        <div class="text-center py-8 sm:py-12">
                            <div class="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                                <svg class="w-8 h-8 sm:w-10 sm:h-10 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                </svg>
                            </div>
                            <flux:text class="text-neutral-500 dark:text-neutral-400 text-sm sm:text-base">
                                {{ __('No documents uploaded yet.') }}
                            </flux:text>
                        </div>
                    @endforelse
                </div>
            </div>
        </div>
    </div>
</div>
