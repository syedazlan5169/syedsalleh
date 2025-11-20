<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $connection = \DB::connection()->getDriverName();
        
        // First, convert existing phone values to JSON array format
        if ($connection === 'sqlite') {
            // For SQLite, convert existing phone values to JSON array format
            $people = \DB::table('people')->get();
            foreach ($people as $person) {
                if ($person->phone !== null && $person->phone !== '') {
                    $phoneArray = json_encode([$person->phone]);
                    \DB::table('people')
                        ->where('id', $person->id)
                        ->update(['phone' => $phoneArray]);
                } else {
                    \DB::table('people')
                        ->where('id', $person->id)
                        ->update(['phone' => null]);
                }
            }
        } else {
            // For MySQL/PostgreSQL
            \DB::statement('UPDATE people SET phone = CASE 
                WHEN phone IS NULL THEN NULL
                WHEN phone = "" THEN NULL
                ELSE JSON_ARRAY(phone)
            END');
        }
        
        Schema::table('people', function (Blueprint $table) use ($connection) {
            // Change column type to JSON (or text for SQLite)
            if ($connection === 'sqlite') {
                // SQLite doesn't have a native JSON type, so we use text
                $table->text('phone')->nullable()->change();
            } else {
                $table->json('phone')->nullable()->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $connection = \DB::connection()->getDriverName();
        
        Schema::table('people', function (Blueprint $table) use ($connection) {
            if ($connection === 'sqlite') {
                // For SQLite, extract first element from JSON array
                $people = \DB::table('people')->get();
                foreach ($people as $person) {
                    if ($person->phone !== null) {
                        $phoneArray = json_decode($person->phone, true);
                        $firstPhone = is_array($phoneArray) && count($phoneArray) > 0 ? $phoneArray[0] : null;
                        \DB::table('people')
                            ->where('id', $person->id)
                            ->update(['phone' => $firstPhone]);
                    }
                }
            } else {
                // For MySQL/PostgreSQL
                \DB::statement('UPDATE people SET phone = CASE 
                    WHEN phone IS NULL THEN NULL
                    WHEN JSON_LENGTH(phone) = 0 THEN NULL
                    ELSE JSON_UNQUOTE(JSON_EXTRACT(phone, "$[0]"))
                END');
            }
            
            // Change column type back to string
            $table->string('phone')->nullable()->change();
        });
    }
};
