import Image from "next/image";
import Socialbar from "../components/Socialbar";
import Navbar from "../components/Navbar";

export default function Resume() {
    return (
        <div className="flex flex-col w-full h-full p-4 gap-4 md:gap-6">
            <Socialbar />
            <Navbar home={true} />
            <div className="flex flex-col gap-16 h-[calc(100vh-160px)] md:flex-row md:mr-24 md:ml-24">
                <div className="flex flex-col mb-6 gap-48 md:mb-0 w-full">
                    <span className="font-tango text-black text-[40pt] md:text-[70pt] text-start leading-none">
                        RESUME
                    </span>
                    <div className="flex flex-row items-center justify-center gap-8">
                        <div className="flex flex-col gap-4 items-center">
                            <a
                                href="/resume.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cursor-pointer transition-transform animate-float"
                            >
                                <Image
                                    src="/resume.png"
                                    alt="Resume"
                                    width={100}
                                    height={100}
                                    sizes="100vw"
                                    priority
                                />
                            </a>
                            <Image
                                src="/shadow.png"
                                alt="shadow"
                                width={70}
                                height={100}
                                sizes="100vw"
                                priority
                            />
                        </div>
                        <span className="font-pixel text-black/20 text-xs self-center -mt-12">
                            (CLICK TO VIEW)
                        </span>
                    </div>
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[90%] h-8 bg-gray-300 rounded-full blur-xl opacity-40" />
            </div>
        </div>
    );
}
