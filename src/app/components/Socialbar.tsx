import Link from "next/link";
import Image from "next/image";

const Socialbar = () => {
    return (
        <div className="flex justify-end">
            <div className="flex flex-row gap-5 text-black">
                <Link href={"https://github.com/gwilson011"} target="_blank">
                    <Image
                        alt="git"
                        src={"/github.png"}
                        width={30}
                        height={30}
                    />
                </Link>
                <Link
                    href={"https://linkedin.com/in/grace-wilson-688452196/"}
                    target="_blank"
                >
                    <Image
                        alt="git"
                        src={"/linkedin.png"}
                        width={30}
                        height={30}
                    />
                </Link>
                <Link href={""} target="_blank">
                    <Image
                        alt="git"
                        src={"/email.png"}
                        width={30}
                        height={30}
                    />
                </Link>
                <Link
                    href={"https://www.instagram.com/grace.dub/"}
                    target="_blank"
                >
                    <Image alt="git" src={"/ig.png"} width={30} height={30} />
                </Link>
            </div>
        </div>
    );
};

export default Socialbar;
