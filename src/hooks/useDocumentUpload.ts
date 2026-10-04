import { Dispatch, SetStateAction } from 'react';
import { DocumentItem } from '@/types';

async function startPolling(url: string, intervalMs = 3000, docId: string, setDocuments: Dispatch<SetStateAction<DocumentItem[]>>) {
    while (true) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            console.log(docId)
            console.log('Отримані дані:', data.output);

            setDocuments((prevDocuments) =>
                prevDocuments.map((doc) =>
                    doc.id === docId
                        ? {
                            ...doc,
                            status: data.output,
                        }
                        : doc
                )
            );

            if (data.output == '[6/6] Finished') {
                break;
            } else if (data.output == 'ERROR') {
                const response = await fetch(`/api/getErrorMessage/${docId}`);
                const data = await response.json();
                console.log(docId)
                alert(`[ERROR]: ${data.output}`);
                break;
            }
        } catch (error) {
            console.error('Помилка під час polling:', error);
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
}

export async function fileUpload(selectedFile: File | null, setIsUploading: (isUploading: boolean) => void, setDocuments: Dispatch<SetStateAction<DocumentItem[]>>, setSelectedFile: (file: File | null) => void) {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        console.log(data.data.docId)
        const fileSizeFormatted =
            selectedFile.size > 1024 * 1024
                ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                : `${(selectedFile.size / 1024).toFixed(0)} KB`;

        const newDoc: DocumentItem = {
            id: data.data.docId,
            name: selectedFile.name,
            size: fileSizeFormatted,
            updatedAt: 'Щойно',
            status: '[1/6] Uploading file',
        };
        setDocuments((prev) => [newDoc, ...prev]);

        startPolling(`/api/getStatus/${data.data.docId}`, 1000, data.data.docId, setDocuments);

        setSelectedFile(null);
    } catch (error) {
        console.error('Помилка під час відправки файлу:', error);
        alert('Не вдалося завантажити файл');
    } finally {
        setIsUploading(false);
    }
}