declare module "*?worker" {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

interface Window {
  MonacoEnvironment?: {
    getWorker?: (moduleId: string, label: string) => Worker;
  };
}
