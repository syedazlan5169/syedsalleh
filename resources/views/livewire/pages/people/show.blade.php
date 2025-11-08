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
    public ?Document $previewDocument = null;
    public bool $showPreviewModal = false;

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
        if (!$document->is_public && $document->person->user_id !== Auth::id()) {
            abort(403);
        }

        return Storage::disk('public')->download($document->file_path, $document->original_name ?? $document->name);
    }

    public function previewDocument(int $documentId): void
    {
        $document = Document::findOrFail($documentId);
        
        if (!$document->is_public && $document->person->user_id !== Auth::id()) {
            abort(403);
        }

        $this->previewDocument = $document;
        $this->showPreviewModal = true;
    }

    public function closePreview(): void
    {
        $this->previewDocument = null;
        $this->showPreviewModal = false;
    }

    public function getPreviewUrlProperty(): ?string
    {
        if (!$this->previewDocument) {
            return null;
        }

        return Storage::disk('public')->url($this->previewDocument->file_path);
    }

    public function isImageProperty(): bool
    {
        if (!$this->previewDocument) {
            return false;
        }

        return str_starts_with($this->previewDocument->mime_type ?? '', 'image/');
    }
}; ?>

<div>
    <div class="flex h-full w-full flex-1 flex-col gap-4">
        <div class="flex items-center justify-between">
            <h1 class="text-2xl font-bold">{{ $person->name }}</h1>
            @if ($person->user_id === Auth::id())
                <flux:button href="{{ route('people.edit', $person) }}" variant="ghost">
                    {{ __('Edit') }}
                </flux:button>
            @endif
        </div>

        <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
                <flux:heading size="lg" class="mb-4">{{ __('Personal Information') }}</flux:heading>
                <div class="space-y-3">
                    <div>
                        <flux:text class="text-sm font-medium text-neutral-500 dark:text-neutral-400">{{ __('NRIC') }}</flux:text>
                        <flux:text>{{ $person->nric }}</flux:text>
                    </div>
                    <div>
                        <flux:text class="text-sm font-medium text-neutral-500 dark:text-neutral-400">{{ __('Date of Birth') }}</flux:text>
                        <flux:text>{{ $person->date_of_birth->format('F d, Y') }}</flux:text>
                    </div>
                    <div>
                        <flux:text class="text-sm font-medium text-neutral-500 dark:text-neutral-400">{{ __('Gender') }}</flux:text>
                        <flux:text>{{ $person->gender }}</flux:text>
                    </div>
                    <div>
                        <flux:text class="text-sm font-medium text-neutral-500 dark:text-neutral-400">{{ __('Occupation') }}</flux:text>
                        <flux:text>{{ $person->occupation }}</flux:text>
                    </div>
                    <div>
                        <flux:text class="text-sm font-medium text-neutral-500 dark:text-neutral-400">{{ __('Address') }}</flux:text>
                        <flux:text>{{ $person->address }}</flux:text>
                    </div>
                    <div>
                        <flux:text class="text-sm font-medium text-neutral-500 dark:text-neutral-400">{{ __('Phone') }}</flux:text>
                        <flux:text>{{ $person->phone }}</flux:text>
                    </div>
                    <div>
                        <flux:text class="text-sm font-medium text-neutral-500 dark:text-neutral-400">{{ __('Email') }}</flux:text>
                        <flux:text>{{ $person->email }}</flux:text>
                    </div>
                </div>
            </div>

            <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
                <flux:heading size="lg" class="mb-4">{{ __('Documents') }}</flux:heading>
                
                @if ($person->user_id === Auth::id())
                    <form wire:submit="uploadDocument" class="mb-6 space-y-4 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                        <flux:input wire:model="document_name" :label="__('Document Name')" type="text" required />
                        <flux:input wire:model="file" :label="__('File')" type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" required />
                        <flux:checkbox wire:model="is_public" :label="__('Make Public')" />
                        <flux:button type="submit" variant="primary" size="sm">
                            {{ __('Upload') }}
                        </flux:button>
                    </form>
                @endif

                <div class="space-y-2">
                    @forelse ($person->documents as $document)
                        @if ($document->is_public || $person->user_id === Auth::id())
                            <div class="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 p-3">
                                <div class="flex-1">
                                    <flux:text class="font-medium">{{ $document->name }}</flux:text>
                                    <flux:text class="text-sm text-neutral-500 dark:text-neutral-400">
                                        {{ $document->is_public ? __('Public') : __('Private') }}
                                    </flux:text>
                                </div>
                                <div class="flex items-center gap-2">
                                    <flux:button 
                                        x-data=""
                                        x-on:click="$wire.previewDocument({{ $document->id }}).then(() => $dispatch('open-modal', 'document-preview'))"
                                        variant="ghost" 
                                        size="sm">
                                        {{ __('Preview') }}
                                    </flux:button>
                                    <flux:button wire:click="downloadDocument({{ $document->id }})" variant="ghost" size="sm">
                                        {{ __('Download') }}
                                    </flux:button>
                                    @if ($person->user_id === Auth::id())
                                        <flux:button wire:click="toggleDocumentVisibility({{ $document->id }})" variant="ghost" size="sm">
                                            {{ $document->is_public ? __('Make Private') : __('Make Public') }}
                                        </flux:button>
                                        <flux:button wire:click="deleteDocument({{ $document->id }})" 
                                            wire:confirm="{{ __('Are you sure you want to delete this document?') }}"
                                            variant="ghost" 
                                            size="sm"
                                            class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                                            {{ __('Delete') }}
                                        </flux:button>
                                    @endif
                                </div>
                            </div>
                        @endif
                    @empty
                        <flux:text class="text-neutral-500 dark:text-neutral-400">
                            {{ __('No documents uploaded yet.') }}
                        </flux:text>
                    @endforelse
                </div>
            </div>
        </div>
    </div>

    <flux:modal 
        name="document-preview" 
        class="max-w-4xl">
        @if ($previewDocument)
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <flux:heading size="lg">{{ $previewDocument->name }}</flux:heading>
                    <flux:modal.close>
                        <flux:button 
                            x-on:click="$wire.closePreview()"
                            variant="ghost" 
                            size="sm">
                            {{ __('Close') }}
                        </flux:button>
                    </flux:modal.close>
                </div>

                <div class="max-h-[70vh] overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-4">
                    @if ($this->isImage)
                        <img src="{{ $this->previewUrl }}" alt="{{ $previewDocument->name }}" class="mx-auto max-w-full h-auto rounded-lg" />
                    @else
                        <iframe src="{{ $this->previewUrl }}" class="w-full h-[70vh] rounded-lg border-0" title="{{ $previewDocument->name }}"></iframe>
                    @endif
                </div>

                <div class="flex items-center justify-end gap-2">
                    <flux:button wire:click="downloadDocument({{ $previewDocument->id }})" variant="primary" size="sm">
                        {{ __('Download') }}
                    </flux:button>
                </div>
            </div>
        @endif
    </flux:modal>
</div>
</div>
