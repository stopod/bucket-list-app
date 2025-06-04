import type { Route } from "./+types/instruments";
import { useEffect, useState } from "react";

// Supabaseの型ファイル
import type { Database } from "../supabase";
// Supabaseを利用する
import { createClient } from "@supabase/supabase-js";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Instruments" }];
}

export async function loader({}: Route.LoaderArgs) {
  // Supabaseに接続
  const supabase = createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase.from("instruments").select();

  if (error) {
    console.error("Error:", error);
  }

  return { instruments: data || [] };
}

export default function Component({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h1>Instruments</h1>
      <ul>
        {loaderData.instruments.map((instrument) => (
          <li key={instrument.id}>{instrument.name}</li>
        ))}
      </ul>
    </div>
  );
}
