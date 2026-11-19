CREATE TABLE "game_pref" (
	"user_id" text NOT NULL,
	"game_id" text NOT NULL,
	"new_tab" boolean DEFAULT true NOT NULL,
	CONSTRAINT "game_pref_user_id_game_id_pk" PRIMARY KEY("user_id","game_id")
);
--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "embed_override" boolean;--> statement-breakpoint
ALTER TABLE "game_pref" ADD CONSTRAINT "game_pref_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_pref" ADD CONSTRAINT "game_pref_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;