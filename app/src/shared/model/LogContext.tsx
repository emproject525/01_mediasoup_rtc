import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

interface LogContextType {
  logs: string[];
  addLog(log: string): void;
}

const LogContext = createContext<LogContextType | null>(null);

export function LogContextProvider({ children }: { children?: ReactNode }) {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((log: string) => setLogs((p) => [...p, log]), []);

  return (
    <LogContext.Provider
      value={{
        logs,
        addLog,
      }}
    >
      {children}
    </LogContext.Provider>
  );
}

export function useLog() {
  const context = useContext(LogContext);
  if (context === null) {
    throw new Error("useLog::NoProvider");
  }
  return context;
}
