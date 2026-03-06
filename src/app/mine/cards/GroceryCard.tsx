"use client";
import Link from "next/link";
import Image from "next/image";

const GroceryCard = () => {
    return (
        <Link href="/groceries">
            <div className="border-default rounded text-black p-1 pr-2 cursor-pointer justify-center flex flex-row gap-2">
                <Image
                    src="/mine/grocery.png"
                    alt="Grocery"
                    width={100}
                    height={50}
                    className="rounded"
                />
            </div>
        </Link>
    );
};

export default GroceryCard;
