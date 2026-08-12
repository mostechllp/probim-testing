import React, { useState } from "react";

const ProjectTags = ({ projectIds, projectsList }) => {
  const [showAll, setShowAll] = useState(false);

  if (!projectIds || projectIds.length === 0) {
    return <span className="text-gray-400 italic text-xs">No projects assigned</span>;
  }

  // Map project IDs to their names
  const assignedProjects = projectIds
    .map((id) => projectsList.find((p) => p.id === id || String(p.id) === String(id)))
    .filter(Boolean);

  const displayLimit = 3;
  const displayItems = assignedProjects.slice(0, displayLimit);
  const remainingCount = assignedProjects.length - displayLimit;

  // FIX: Stop event propagation to prevent row click
  const toggleShowAll = (e) => {
    e.stopPropagation(); // This prevents the click from bubbling up
    setShowAll(!showAll);
  };

  // FIX: Stop propagation on the container as well
  const handleContainerClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="flex flex-wrap items-center gap-1.5 justify-start max-w-full"
      onClick={handleContainerClick} // Stop propagation on the whole container
    >
      {showAll ? (
        // Show all projects - NO TRUNCATION
        assignedProjects.map((proj) => (
          <span
            key={proj.id}
            className="inline-flex items-center px-2.5 py-1 text-xs font-bold leading-none text-green-700 dark:text-green-300 bg-green-500/10 dark:bg-green-500/5 rounded-full border border-green-500/10 dark:border-green-500/10 whitespace-nowrap"
            title={proj.name}
          >
            {proj.name}
          </span>
        ))
      ) : (
        // Show limited projects - NO TRUNCATION
        displayItems.map((proj) => (
          <span
            key={proj.id}
            className="inline-flex items-center px-2.5 py-1 text-xs font-bold leading-none text-green-700 dark:text-green-300 bg-green-500/10 dark:bg-green-500/5 rounded-full border border-green-500/10 dark:border-green-500/10 whitespace-nowrap"
            title={proj.name}
          >
            {proj.name}
          </span>
        ))
      )}

      {remainingCount > 0 && (
        <button
          onClick={toggleShowAll}
          className="inline-flex items-center px-2 py-1 text-[10px] font-extrabold leading-none text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-200 dark:border-blue-800/40 hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
          title={showAll ? "Show less" : `Show all ${assignedProjects.length} projects`}
        >
          {showAll ? (
            <>
              <i className="fas fa-chevron-up text-[8px] mr-1"></i>
              Show less
            </>
          ) : (
            <>
              +{remainingCount} more
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ProjectTags;