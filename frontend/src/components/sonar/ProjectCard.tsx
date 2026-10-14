import React from 'react';
import { ExternalLink, Calendar } from 'lucide-react';
import { SonarProject } from '../../types/sonar';

interface ProjectCardProps {
  project: SonarProject;
  serverUrl: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, serverUrl }) => {
  const projectUrl = `${serverUrl.replace(/\/+$/, '')}/dashboard?id=${encodeURIComponent(project.key)}`;

  const getGateBadge = () => {
    switch (project.qualityGateStatus) {
      case 'OK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Quality Gate Passed
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Quality Gate Failed
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Quality Gate Warning
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/70 rounded-xl px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Project Identity */}
      <div className="space-y-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
            {project.name || project.key}
          </h2>
          {getGateBadge()}
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono flex-wrap">
          <span>{project.key}</span>
          {project.version && (
            <>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">v{project.version}</span>
            </>
          )}
          {project.lastAnalysisDate && (
            <>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-500 flex items-center gap-1 font-sans">
                <Calendar className="w-3 h-3 text-zinc-500" />
                {new Date(project.lastAnalysisDate).toLocaleDateString()}
              </span>
            </>
          )}
          <a
            href={projectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-zinc-400 hover:text-zinc-200 transition-colors ml-1 font-sans"
          >
            <span>SonarQube</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Metrics overview */}
      <div className="flex items-center gap-6 text-xs font-mono self-start md:self-auto">
        {project.metrics?.ncloc !== undefined && (
          <div>
            <div className="text-[10px] uppercase font-sans text-zinc-500">Lines of Code</div>
            <div className="font-semibold text-zinc-200">{project.metrics.ncloc.toLocaleString()}</div>
          </div>
        )}
        {project.metrics?.coverage && (
          <div>
            <div className="text-[10px] uppercase font-sans text-zinc-500">Coverage</div>
            <div className="font-semibold text-emerald-400">{project.metrics.coverage}</div>
          </div>
        )}
        {project.metrics?.duplications && (
          <div>
            <div className="text-[10px] uppercase font-sans text-zinc-500">Duplication</div>
            <div className="font-semibold text-amber-400">{project.metrics.duplications}</div>
          </div>
        )}
      </div>
    </div>
  );
};
