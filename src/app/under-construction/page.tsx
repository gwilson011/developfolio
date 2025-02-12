import Image from "next/image";
import Socialbar from "../components/Socialbar";
import Navbar from "../components/Navbar";

export default function Resume() {
    return (
        <div className="flex flex-col w-full h-full p-4 gap-4 md:gap-6">
            <Socialbar />
            <Navbar home={true} />
            <div className="flex flex-col gap-16 h-[calc(100vh-160px)] md:flex-row md:mr-24 md:ml-24">
                <div className="flex flex-col mb-6 gap-2 w-full h-full items-center justify-center">
                    <span className="font-tango text-black text-2xl self-center">
                        UNDER CONSTRUCTION.
                    </span>
                    <Image
                        src="/construction.gif"
                        alt="shadow"
                        width={70}
                        height={100}
                        priority
                    />
                    <span className="font-pixel text-black/30 text-xs self-center">
                        CHECK BACK SOON!
                    </span>
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[90%] h-8 bg-gray-300 rounded-full blur-xl opacity-40" />
            </div>
        </div>
    );
}
