"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const Socialbar = (props: any) => {
    const [hover, setHover] = useState<boolean>(false);
    return (
        <div
            className="flex flex-row gap-2 border-default text-black p-4 justify-between hover:text-white hover:bg-black"
            onMouseEnter={() => setHover && setHover(true)}
            onMouseLeave={() => setHover && setHover(false)}
        >
            <div className="flex flex-col">
                <span className="font-tango text-3xl">
                    {props.project.title}
                </span>
                {hover && (
                    <div className="font-louis flex-1 break-words overflow-y-auto max-w-80">
                        {props.project.desc}
                    </div>
                )}
            </div>
            {hover && (
                <div className="flex flex-row gap-2">
                    <Image
                        alt="home"
                        src={props.project.image}
                        width={200}
                        height={80}
                        className="rounded w-full overflow-hidden"
                    />
                    <div className="flex flex-col gap-2">
                        <Link
                            href={props.project.href.demo}
                            className="flex p-1 px-2 bg-white border-default text-black font-tango text-md hover:text-white hover:bg-black"
                            target="_blank"
                        >
                            DEMO
                        </Link>
                        <Link
                            href={props.project.href.repo}
                            className="flex p-1 px-2 bg-white border-default text-black font-tango text-md hover:text-white hover:bg-black"
                            target="_blank"
                        >
                            REPO
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Socialbar;
