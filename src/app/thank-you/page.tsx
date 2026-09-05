import Link from "next/link";
import type { Metadata } from "next";
export const metadata: Metadata={title:"Thank you",robots:{index:false,follow:false}};
export default function Page(){return <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-20"><h1 className="text-4xl font-bold">Thank you!</h1><p className="mt-4 text-zinc-600 dark:text-zinc-300">We appreciate your interest in AI Teacher.</p><Link href="/classroom" className="mt-8 font-semibold text-blue-700 hover:underline">Try the classroom →</Link></main>}
