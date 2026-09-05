import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 bg-zinc-50 font-sans dark:bg-zinc-950">
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-5 py-24 text-center">
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="font-semibold text-blue-700 dark:text-blue-300">Adaptive learning, not a static chatbot</p>
          <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Learn with an AI teacher that adapts to you.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Upload learning material, choose a learner profile, and get source-grounded explanations, questions, feedback, and progress.
          </p>
          <div className="flex flex-col gap-4 text-base font-medium sm:flex-row mt-6">
            <Link
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-8 text-white transition-colors md:w-auto"
              href="/classroom"
            >
              Create a lesson
            </Link>
          </div>
          <Link href="/waitlist" className="font-semibold text-blue-700 hover:underline dark:text-blue-300">Join the waitlist →</Link>
        </div>
      </section>
      <section id="how-it-works" className="border-y border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900"><div className="mx-auto max-w-6xl px-5"><h2 className="text-3xl font-bold">How it works</h2><div className="mt-7 grid gap-4 md:grid-cols-4">{[["Understand","Upload a document or choose a topic."],["Plan","Set level, language, time, and goal."],["Teach","Get explanations, visuals, voice, and citations."],["Adapt","Answer questions and receive targeted support."]].map(([title,copy])=><article className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-700" key={title}><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{copy}</p></article>)}</div></div></section>
      <section className="mx-auto max-w-6xl px-5 py-16"><h2 className="text-3xl font-bold">Frequently asked questions</h2><div className="mt-6 grid gap-4 md:grid-cols-2">{[["What can I upload?","PDF, DOCX, PPTX, TXT, and Markdown learning material up to 10 MB."],["Is it grounded in my document?","Yes. Relevant source chunks are retrieved and displayed as citations."],["How does it adapt?","It evaluates an answer and gives a simpler explanation, visual, or follow-up question."],["Can I choose a language?","English, Hindi, and Hinglish are available in the lesson form."],["Does progress persist?","Lesson state, reports, and concept progress persist across reloads."]].map(([q,a])=><details className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900" key={q}><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{a}</p></details>)}</div><Link className="mt-6 inline-block font-semibold text-blue-700 hover:underline" href="/faq">See all FAQs →</Link></section>
      <section className="bg-blue-700 px-5 py-14 text-center text-white"><h2 className="text-3xl font-bold">Ready to learn differently?</h2><Link href="/classroom" className="mt-6 inline-block rounded-md bg-white px-6 py-3 font-semibold text-blue-800">Open classroom</Link></section>
    </main>
  );
}
