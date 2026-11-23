CREATE INDEX "match_act_slug_idx" ON "match" USING btree ("act_slug");--> statement-breakpoint
CREATE INDEX "match_created_at_idx" ON "match" USING btree ("created_at");