import { Octokit } from "@octokit/rest";

export const pushToGitHub = async (
  token: string,
  repoPath: string, // format: "owner/repo"
  files: { path: string; content: string }[],
  message: string = "Updated from Alfacomp IDE"
) => {
  try {
    const octokit = new Octokit({ auth: token });
    const [owner, repo] = repoPath.split("/");

    // 1. Get the default branch (usually main or master)
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const branch = repoData.default_branch;

    // 2. Get the latest commit SHA of the default branch
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    const lastCommitSha = refData.object.sha;

    // 3. Get the tree SHA of the latest commit
    const { data: commitData } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: lastCommitSha,
    });
    const baseTreeSha = commitData.tree.sha;

    // 4. Create blobs for each file
    const blobs = await Promise.all(
      files.map(async (file) => {
        const { data: blobData } = await octokit.git.createBlob({
          owner,
          repo,
          content: file.content,
          encoding: "utf-8",
        });
        return {
          path: file.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: blobData.sha,
        };
      })
    );

    // 5. Create a new tree
    const { data: treeData } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: blobs,
    });

    // 6. Create a new commit
    const { data: newCommitData } = await octokit.git.createCommit({
      owner,
      repo,
      message,
      tree: treeData.sha,
      parents: [lastCommitSha],
    });

    // 7. Update the reference
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommitData.sha,
    });

    return { success: true, commitUrl: newCommitData.html_url };
  } catch (error: any) {
    console.error("GitHub Push Error:", error);
    throw new Error(error.message || "Failed to push to GitHub");
  }
};
