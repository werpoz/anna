export default function SessionWelcome() {
    return (
        <div className="flex-1 h-full bg-[#f0f2f5] dark:bg-[#222e35] border-b-[6px] border-[#25d366] flex flex-col items-center justify-center text-center">
            <div className="w-[300px] h-[200px] opacity-40 bg-[url('https://static.whatsapp.net/rsrc.php/v3/y6/r/wa66945g.png')] bg-no-repeat bg-center bg-contain mb-8 grayscale"></div>
            <h1 className="text-[32px] font-light text-[#41525d] dark:text-[#e9edef] mb-4">Anna Web</h1>
            <p className="text-[#8696a0] text-sm">
                Send and receive messages without keeping your phone online.
            </p>

            <div className="mt-10 flex items-center gap-2 text-[#8696a0] text-xs">
                <span className="w-2.5 h-3 bg-current mask-icon" />
                End-to-end encrypted
            </div>
        </div>
    );
}
