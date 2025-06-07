import type { Route } from "./+types/home";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { z } from "zod";
import { redirect } from "react-router";
import { parseWithZod } from "@conform-to/zod";
import { Form } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "bucket-list-app" },
    { name: "description", content: "hello~ ^^" },
  ];
}

const schema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Email is invalid"),
  password: z
    .string({ required_error: "password is required" })
    .min(8, "password is too short")
    .max(100, "password is too long"),
});

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  console.log(submission.value);

  return redirect("/instruments");
}

export default function Home() {
  return (
    <Form method="post" className="flex flex-col items-center">
      <div>
        <h1 className="text-2xl font-bold mb-4 mt-4">
          Welcome to Bucket List App
        </h1>
        <Input type="email" name="email" placeholder="Email" />
        <Input type="password" name="password" placeholder="Password" />
        <Button type="submit" className="mt-4" variant="outline">
          Sign In
        </Button>
      </div>
    </Form>
  );
}
