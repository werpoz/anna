import { QRCodeSVG } from 'qrcode.react';
import { Session } from '../domain/Session';

interface SessionQRViewProps {
    session: Session;
}

export default function SessionQRView({ session }: SessionQRViewProps) {
    return (
        <div className="flex-1 h-full bg-white dark:bg-[#111b21] flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-[600px] border border-[#d1d7db] dark:border-[#222d34] rounded-lg shadow-sm bg-white dark:bg-[#111b21] p-10 flex text-[#41525d] dark:text-[#e9edef] transition-all">
                <div className="flex-1 pr-10 border-r border-[#d1d7db] dark:border-[#222d34]">
                    <h2 className="text-[26px] font-light mb-8">Use WhatsApp with Anna</h2>
                    <ol className="text-[16px] leading-[28px] list-decimal ml-5 space-y-4 text-[#3b4a54] dark:text-[#d1d7db]">
                        <li>Open WhatsApp on your phone</li>
                        <li>Tap <strong>Menu</strong> or <strong>Settings</strong> and select <strong>Linked Devices</strong></li>
                        <li>Tap on <strong>Link a Device</strong></li>
                        <li>Point your phone to this screen to capture the code</li>
                    </ol>
                </div>
                <div className="w-[264px] flex flex-col items-center justify-center pl-10">
                    {session.qr ? (
                        <div className="relative group cursor-pointer">
                            <div className="w-[264px] h-[264px] bg-white border border-[#d1d7db] p-4 rounded-sm shadow-sm flex items-center justify-center">
                                <QRCodeSVG
                                    value={session.qr}
                                    size={232}
                                    level="M"
                                    includeMargin={false}
                                    className="opacity-90 group-hover:opacity-100 transition-opacity"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="w-[264px] h-[264px] flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full border-4 border-[#d1d7db] border-t-[#00a884] animate-spin"></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
