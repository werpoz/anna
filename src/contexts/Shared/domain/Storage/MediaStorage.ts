export type UploadBufferParams = {
    key: string;
    body: Buffer;
    contentType?: string | null;
};

export type UploadResult = {
    key: string;
    url: string;
};

export interface MediaStorage {
    uploadBuffer(params: UploadBufferParams): Promise<UploadResult>;
}
