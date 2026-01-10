export default function AppWelcome() {
    return (
        <div className="flex-1 h-full bg-[#f0f2f5] dark:bg-[#222e35] border-b-[6px] border-[#25d366] flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="text-[#41525d] dark:text-[#e9edef] max-w-[560px] z-10 p-10">
                <h1 className="text-[32px] font-light mb-5 tracking-tight">Anna Sessions</h1>
                <p className="text-[#8696a0] text-sm leading-6">
                    Send and receive messages without keeping your phone online.<br />
                    Use Anna on up to 4 linked devices and 1 phone.
                </p>
            </div>
        </div>
    );
}
