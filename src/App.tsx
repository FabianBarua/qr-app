
import { useEffect, useRef, useState } from "react";
import './App.css';
import { Button, ScrollShadow, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@nextui-org/react";
import { Upload, X, Check } from 'lucide-react';
import axios from 'axios';
import confetti from 'canvas-confetti';


async function getSessionId(token: string): Promise<string> {
  const response = await axios.post(
    "https://content.dropboxapi.com/2/files/upload_session/start",
    null,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Dropbox-API-Arg": JSON.stringify({ close: false }),
        "Content-Type": "application/octet-stream"
      }
    }
  );

  return response.data.session_id;
}


async function uploadFile(file: File, sessionId: string, setActive: (file: File) => void, token: string, setProgress: (progress: number) => void): Promise<void> {
  const fileSize = file.size;
  const chunkSize = 8 * 1024 * 1024; // 8MB chunks
  let offset = 0;
  setActive(file);

  while (offset < fileSize) {
    const chunk = file.slice(offset, offset + chunkSize);

    await axios.post(
      "https://content.dropboxapi.com/2/files/upload_session/append_v2",
      chunk,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Dropbox-API-Arg": JSON.stringify({
            cursor: {
              offset: offset,
              session_id: sessionId
            },
            close: false
          }),
          "Content-Type": "application/octet-stream"
        },
        onUploadProgress: (progressEvent) => {
          const loaded = progressEvent.loaded + offset;
          const total = fileSize;
          const progress = Math.round((loaded / total) * 100);
          setProgress(progress); // Update progress
        }
      }
    );

    offset += chunkSize;
  }

  await axios.post(
    "https://content.dropboxapi.com/2/files/upload_session/finish",
    null,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Dropbox-API-Arg": JSON.stringify({
          commit: {
            autorename: true,
            mode: "add",
            mute: false,
            path: `/galeria/${file.name}`,
            strict_conflict: false
          },
          cursor: {
            offset: fileSize,
            session_id: sessionId
          }
        }),
        "Content-Type": "application/octet-stream"
      }
    }
  );

}


const NoFiles = () => (
  <div className="my-auto mx-auto text-center">
    <p>Ningún archivo seleccionado</p>
    <p>Selecciona archivos</p>
    <Button
      color="default"
      variant="flat"
      onClick={() => {
        const fileInput = document.getElementById("file") as HTMLInputElement;
        if (fileInput) {
          fileInput.click();
        }
      }}
      className="mt-2"
    >
      Seleccionar
    </Button>
  </div>
);

const App = () => {
  const [TOKEN, setTOKEN] = useState("")
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progresses, setProgresses] = useState<{ [key: number]: number }>({});
  const [fileActive, setFileActive] = useState<File | null>(null);
  const [failedFiles, setFailedFiles] = useState<File[]>([]);

  const { isOpen, onOpenChange, onOpen } = useDisclosure();

  const isValidToken = async (token: string) => {

    try {
      await axios.post("https://api.dropboxapi.com/2/users/get_current_account", null, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      return true;
    }
    catch (error) {
      console.error("Token inválido", error)
      return false
    }

  }

  const refreshToken = async () => {

    const refresh_token = import.meta.env.VITE_REFRESH_TOKEN
    const grant_type = "refresh_token"
    const client_id = import.meta.env.VITE_CLIENT_ID
    const client_secret = import.meta.env.VITE_CLIENT_SECRET
    const finalUrl = `https://api.dropbox.com/oauth2/token?refresh_token=${refresh_token}&grant_type=${grant_type}&client_id=${client_id}&client_secret=${client_secret}`

    axios.post(finalUrl).then((response) => {
      setTOKEN(response.data.access_token)
      localStorage.setItem("token", response.data.access_token)
    })

  }


  useEffect(() => {

    const init = async () => {

      const storagedToken = localStorage.getItem("token")

      if (storagedToken && await isValidToken(storagedToken)) {
        setTOKEN(storagedToken)
      } else {
        refreshToken()
      }

    }

    init()

  }, [])

  useEffect(() => {
    setFileActive(files[0] || null);
  }, [files]);

  const startUpload = async () => {
    setIsLoading(true);
    setFailedFiles([]); // Limpiar lista de archivos fallidos

    for (const [index, file] of files.entries()) {
      try {
        const sessionId = await getSessionId(TOKEN);

        await uploadFile(
          file,
          sessionId,
          (file) => setFileActive(file),
          TOKEN,
          (progress) => setProgresses(current => ({ ...current, [index]: progress })),
        );

      } catch (error) {
        console.error(`Error al cargar el archivo ${file.name}:`, error);
        setFailedFiles(current => [...current, file]); // Agregar a la lista de archivos fallidos
      }
    }

    onOpen()
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    setFiles([]);
    setProgresses({});
    setIsLoading(false);
  };

  const getProgressForFile = (file: File) => {
    const index = files.findIndex(f => f === file);
    return progresses[index] || 0;
  };

  return (<>
    <Modal isOpen={isOpen} placement="bottom-center" onOpenChange={onOpenChange}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">Archivos enviados!</ModalHeader>
            <ModalBody>
              {failedFiles.length > 0 ? (
                <p>Algunos archivos no pudieron cargarse:</p>
              ) : (
                <p>Felicidades, tus archivos han sido enviados correctamente.</p>
              )}
              {failedFiles.map(file => (
                <p key={file.name}>{file.name}</p>
              ))}
            </ModalBody>
            <ModalFooter>
              <Button color="primary" onPress={onClose}>Aceptar</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>

    <div className="h-dvh max-w-xl mx-auto">
      <div className="rounded-b-[50px] bg-default-50 h-[30%] flex justify-center items-center flex-col gap-5">
        <h1 className="max-w-96 text-3xl text-center text-balance">
          Sube tus fotos o videos en <span className="font-bold">nuestra galería</span>
        </h1>

        <input
          id="file"
          type="file"
          ref={fileInput}
          hidden
          onChange={(e) => {
            if (e.target.files) {
              const newFiles = Array.from(e.target.files);

              // Filtrar los archivos que ya existen en la lista
              const uniqueFiles = newFiles.filter(newFile =>
                !files.some(existingFile => existingFile.name === newFile.name)
              );

              // Añadir solo archivos nuevos
              setFiles([...files, ...uniqueFiles]);
            }
          }}
          multiple
        />

        <Button
          color="primary"
          onClick={() => {
            if (fileInput.current) {
              fileInput.current.click();
            }
          }}
          endContent={<Upload size={16} />}
        >
          Seleccionar archivos
        </Button>
      </div>

      <ScrollShadow hideScrollBar className="overflow-y-auto h-[calc(100%-36%)] flex-col gap-2 p-5 flex relative">
        {files.map((file, index) => {
          const progress = getProgressForFile(file);
          const strokeDasharray = 120; // Ajusta este valor según tu SVG
          const strokeDashoffset = strokeDasharray - (progress / 100) * strokeDasharray;

          return (
            <div key={file.name} className="gap-5 flex w-full p-2 bg-content1 rounded-xl">
              <div className="relative h-10">
                <svg className="size-full -rotate-90" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="32" height="32" rx="8" ry="8" fill="none" className="stroke-current text-gray-200 dark:text-neutral-700" strokeWidth="2"></rect>
                  <rect x="2" y="2" width="32" height="32" rx="8" ry="8" fill="none" className="stroke-current text-blue-600 dark:text-blue-500" strokeWidth="2" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} strokeLinecap="round"></rect>
                </svg>

                <div className="absolute top-[45%] start-1/2 transform -translate-y-1/2 -translate-x-1/2">
                  <span
                    style={{ opacity: fileActive === file || !isLoading ? 1 : 0.3 }}
                    className="text-center tracking-tighter text-sm font-semibold text-blue-500"
                  >
                    {progress}%
                  </span>
                </div>
              </div>

              <div style={{ opacity: fileActive === file || !isLoading ? 1 : 0.3 }} className="my-auto">
                <span className="h-min w-full max-w-52 line-clamp-1 text-ellipsis overflow-hidden leading-4">{file.name}</span>
                <span className="text-sm text-foreground-500">
                  {file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                </span>
              </div>
              <Button
                disabled={isLoading}
                style={{ opacity: fileActive === file || !isLoading ? 1 : 0.3 }}
                color={progresses[index] === 100 ? "success" : "danger"}
                variant="light"
                isIconOnly
                className="ml-auto"
                onClick={() => {
                  // TODO: Cancel transfer if it started
                  setFiles(files.filter((_, i) => i !== index));
                  if (fileInput.current) {
                    fileInput.current.value = "";
                  }
                }}
              >
                {
                  progresses[index] === 100 ? failedFiles.find(f => f === file) ? <X size={16} /> : <Check size={16} /> : <X size={16} />
                }
              </Button>
            </div>
          );
        })}

        {files.length === 0 && <NoFiles />}
      </ScrollShadow>

      <div className="px-5 flex justify-between items-center h-[5%]">
        <div className="flex-1 my-auto">
          <p className="leading-4">
            {files.length} archivo{files.length === 1 ? "" : "s"} seleccionado{files.length === 1 ? "" : "s"}
          </p>
          <p className="text-sm text-foreground-400">
            {
              fileActive ? `${files.findIndex(f => f === fileActive)}` : "0"
            }
            /{files.length} archivos enviados
          </p>
        </div>

        <Button
          color={isLoading || files.length === 0 ? "default" : "primary"}
          variant={isLoading || files.length === 0 ? "flat" : "solid"}
          onClick={startUpload}
          disabled={files.length === 0 || isLoading}
          className="h-full w-auto max-w-10"
        >
          {isLoading ? "Enviando..." : "Enviar"}
        </Button>
      </div>
    </div>
  </>

  );
}

export default App;
