import { useState } from "react";
import { useFetcher } from "react-router";

export function FileUpload({
  action,
  fieldName = "file",
  extraFields = {},
}: {
  action: string;
  /** The key to use in FormData for the selected file */
  fieldName?: string;
  /** Additional key/value pairs to append to the FormData */
  extraFields?: Record<string, string>;
}) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const fetcher = useFetcher();
  const isUploading = fetcher.state === "submitting";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append(fieldName, file);
    for (const [key, value] of Object.entries(extraFields)) {
      formData.append(key, value);
    }

    // Create a new XMLHttpRequest to track upload progress
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        setUploadProgress(progress);
      }
    });

    // Use the fetcher to submit the form
    fetcher.submit(formData, {
      method: "post",
      action,
      encType: "multipart/form-data",
    });
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="mb-4">
        <label
          htmlFor="file-upload"
          className="block text-sm font-medium text-gray-700"
        >
          Choose a file to upload
        </label>
        <input
          id="file-upload"
          type="file"
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
          disabled={isUploading}
          accept="image/png,image/jpeg,image/webp"
        />
      </div>

      {isUploading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Uploading... {Math.round(uploadProgress)}%
          </p>
        </div>
      )}

      {fetcher.data && (
        <div
          className={`mt-4 p-4 rounded-md ${
            fetcher.data.error
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {fetcher.data.error || "File uploaded successfully!"}
        </div>
      )}
    </div>
  );
}
