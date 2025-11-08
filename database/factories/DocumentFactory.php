<?php

namespace Database\Factories;

use App\Models\Person;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Document>
 */
class DocumentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'person_id' => Person::factory(),
            'name' => fake()->words(3, true).'.pdf',
            'file_path' => 'documents/'.fake()->uuid().'.pdf',
            'original_name' => fake()->words(3, true).'.pdf',
            'file_size' => fake()->numberBetween(1000, 10000000),
            'mime_type' => 'application/pdf',
            'is_public' => fake()->boolean(),
        ];
    }
}
