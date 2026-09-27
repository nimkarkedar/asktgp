import Header from "../components/Header";

const link = "underline underline-offset-2 hover:opacity-60";

export default function About() {
  return (
    <main className="min-h-dvh">
      <Header />
      <article className="mx-auto max-w-[592px] px-4 pt-12 lg:pt-16 pb-24">
        <h1 className="text-[22px] lg:text-[28px] leading-[1.3]">About</h1>
        <div className="mt-8 space-y-5 text-base lg:text-[17px] leading-[1.7]">
          <p>
            Ask TGP is an AI oracle built on conversations that{" "}
            <a href="https://www.nimkarkedar.com/about" target="_blank" rel="noopener noreferrer" className={link}>
              Kedar Nimkar
            </a>{" "}
            has recorded with some of the finest minds from India&apos;s creative world on{" "}
            <a href="https://thegyaanproject.com" target="_blank" rel="noopener noreferrer" className={link}>
              The Gyaan Project
            </a>{" "}
            Podcast.
          </p>
          <p>
            Ask it anything, and it responds with a short answer and a long answer, drawn from conversations. Expect
            philosophical answers and insights rather than practical tips and instructions.
          </p>
          <p>
            Nothing is pre-written. Every response is generated fresh, straight from the source. It can make mistakes.
            Treat these answers as a starting point, not gospel.
          </p>
          <p>
            The Gyaan Project is a podcast and{" "}
            <a href="https://www.youtube.com/channel/UCeZKC5zFI0WSPpHsif4eIlw/" target="_blank" rel="noopener noreferrer" className={link}>
              YouTube channel
            </a>{" "}
            dedicated to exploring creative wisdom. Since 2016, it has been chronicling the ideas, philosophies, and
            stories of Indian luminaries: designers, artists, musicians, writers, and thinkers. It functions as a
            contemporary creative archive, bridging the past with the present to inspire the future.
          </p>
          <p>
            At its heart, TGP is to widen our understanding of design and art, and their impact on culture, society, and
            individual lives.
          </p>
          <p>
            TGP is the brain child of{" "}
            <a href="https://www.linkedin.com/in/nimkarkedar/" target="_blank" rel="noopener noreferrer" className={link}>
              Kedar Nimkar
            </a>
            . Kedar is a design leader with over two decades of experience shaping Indian and South East Asian digital
            landscape. He has held senior roles at Cleartrip, Jupiter, BookMyShow, and PropertyGuru in Singapore.
          </p>
          <p>
            Got questions? Feedback? Reach out to him at{" "}
            <a href="mailto:thegyaanprojectpodcast@gmail.com" className={link}>
              thegyaanprojectpodcast@gmail.com
            </a>
          </p>
        </div>
      </article>
    </main>
  );
}
