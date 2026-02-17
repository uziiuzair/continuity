"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Project } from "@/types/project";
import { isTauriContext } from "@/lib/db";
import {
  createProject as dbCreateProject,
  getAllProjects,
  updateProject as dbUpdateProject,
  archiveProject as dbArchiveProject,
  getProject as dbGetProject,
  updateProjectTimestamp,
} from "@/lib/db/projects";
import { useDatabase } from "./database-provider";

interface ProjectsContextType {
  projects: Project[];
  activeProjectId: string | null;
  isLoading: boolean;
  createProject: (name: string, customPrompt?: string) => Promise<Project>;
  updateProject: (id: string, data: Partial<Pick<Project, "name" | "customPrompt">>) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  setActiveProject: (id: string | null) => void;
  refreshProjects: () => Promise<void>;
  getProjectById: (id: string) => Promise<Project | null>;
  touchProject: (id: string) => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(
  undefined
);

const ACTIVE_PROJECT_KEY = "ooozzy_active_project_id";

export const ProjectsProvider = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isReady: dbReady } = useDatabase();

  // Load projects from database when DB is ready
  useEffect(() => {
    const loadProjects = async () => {
      if (!dbReady) return;

      if (!isTauriContext()) {
        setIsLoading(false);
        return;
      }

      try {
        const loadedProjects = await getAllProjects();
        setProjects(loadedProjects);

        // Restore active project from localStorage
        const savedActiveId = localStorage.getItem(ACTIVE_PROJECT_KEY);
        if (
          savedActiveId &&
          loadedProjects.some((p) => p.id === savedActiveId)
        ) {
          setActiveProjectId(savedActiveId);
        }
      } catch (error) {
        console.error("Failed to load projects:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [dbReady]);

  // Persist active project ID to localStorage
  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  }, [activeProjectId]);

  const refreshProjects = useCallback(async () => {
    if (!isTauriContext()) return;

    try {
      const loadedProjects = await getAllProjects();
      setProjects(loadedProjects);
    } catch (error) {
      console.error("Failed to refresh projects:", error);
    }
  }, []);

  const createProject = useCallback(
    async (name: string, customPrompt?: string): Promise<Project> => {
      if (!isTauriContext()) {
        throw new Error("Database operations require Tauri context");
      }

      const project = await dbCreateProject(name, customPrompt);
      setProjects((prev) => [project, ...prev]);
      return project;
    },
    []
  );

  const updateProject = useCallback(
    async (id: string, data: Partial<Pick<Project, "name" | "customPrompt">>): Promise<void> => {
      if (!isTauriContext()) {
        throw new Error("Database operations require Tauri context");
      }

      await dbUpdateProject(id, data);
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ...data, updatedAt: new Date() } : p
        )
      );
    },
    []
  );

  const archiveProject = useCallback(
    async (id: string): Promise<void> => {
      if (!isTauriContext()) {
        throw new Error("Database operations require Tauri context");
      }

      await dbArchiveProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));

      if (activeProjectId === id) {
        setActiveProjectId(null);
      }
    },
    [activeProjectId]
  );

  const setActiveProject = useCallback((id: string | null) => {
    setActiveProjectId(id);
  }, []);

  const getProjectById = useCallback(async (id: string): Promise<Project | null> => {
    if (!isTauriContext()) {
      throw new Error("Database operations require Tauri context");
    }

    return dbGetProject(id);
  }, []);

  const touchProject = useCallback(async (id: string): Promise<void> => {
    if (!isTauriContext()) return;

    try {
      await updateProjectTimestamp(id);
      setProjects((prev) => {
        const updated = prev.map((p) =>
          p.id === id ? { ...p, updatedAt: new Date() } : p
        );
        // Re-sort by updatedAt
        return updated.sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
        );
      });
    } catch (error) {
      console.error("Failed to touch project:", error);
    }
  }, []);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        activeProjectId,
        isLoading,
        createProject,
        updateProject,
        archiveProject,
        setActiveProject,
        refreshProjects,
        getProjectById,
        touchProject,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
};

export const useProjects = (): ProjectsContextType => {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
};
