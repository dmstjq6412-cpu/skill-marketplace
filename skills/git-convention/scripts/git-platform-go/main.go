package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"regexp"
	"strings"
)

// ── 플래그 ────────────────────────────────────────────────────
var (
	platform = flag.String("platform", "gitea", "git 플랫폼: gitea | github | gitlab")
	base     = flag.String("base", "", "대상 브랜치 (필수)")
	head     = flag.String("head", "", "소스 브랜치 (필수)")
	title    = flag.String("title", "", "PR 제목 (필수)")
	body     = flag.String("body", "", "PR 본문")
	reviewer = flag.String("reviewer", "", "리뷰어 username")
)

func main() {
	// pr create 서브커맨드
	if len(os.Args) < 3 || os.Args[1] != "pr" || os.Args[2] != "create" {
		fmt.Fprintln(os.Stderr, "사용법: git-platform pr create --platform <gitea|github|gitlab> --base <브랜치> --head <브랜치> --title <제목> [--body <내용>] [--reviewer <username>]")
		os.Exit(1)
	}

	flag.CommandLine.Parse(os.Args[3:])

	if *base == "" || *head == "" || *title == "" {
		fmt.Fprintln(os.Stderr, "[오류] --base, --head, --title 은 필수입니다.")
		os.Exit(1)
	}

	var prURL string
	var err error

	switch *platform {
	case "gitea":
		prURL, err = createGiteaPR()
	case "github":
		prURL, err = createGitHubPR()
	case "gitlab":
		prURL, err = createGitLabPR()
	default:
		fmt.Fprintf(os.Stderr, "[오류] 지원하지 않는 플랫폼: %s\n", *platform)
		os.Exit(1)
	}

	if err != nil {
		fmt.Fprintln(os.Stderr, "[오류]", err)
		os.Exit(1)
	}

	fmt.Println("✅ PR 생성 완료")
	fmt.Println("PR URL:", prURL)
}

// ── remote URL 파싱 ───────────────────────────────────────────
func getOwnerRepo() (string, string, error) {
	out, err := exec.Command("git", "remote", "get-url", "origin").Output()
	if err != nil {
		return "", "", fmt.Errorf("git remote 조회 실패: %w", err)
	}
	remoteURL := strings.TrimSpace(string(out))

	// http(s)://host/owner/repo.git  또는  git@host:owner/repo.git
	re := regexp.MustCompile(`[:/]([^/]+)/([^/]+?)(?:\.git)?$`)
	m := re.FindStringSubmatch(remoteURL)
	if len(m) < 3 {
		return "", "", fmt.Errorf("remote URL 파싱 실패: %s", remoteURL)
	}
	return m[1], m[2], nil
}

// ── HTTP POST 헬퍼 ────────────────────────────────────────────
func postJSON(reqURL string, headers map[string]string, payload any) (map[string]any, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", reqURL, bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	var result map[string]any
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("응답 파싱 실패: %w", err)
	}
	return result, nil
}

// ── Gitea ─────────────────────────────────────────────────────
func createGiteaPR() (string, error) {
	host := os.Getenv("GITEA_HOST")
	token := os.Getenv("GITEA_TOKEN")

	if host == "" || token == "" {
		return "", fmt.Errorf("환경변수가 설정되지 않았습니다.\n  export GITEA_HOST=http://your-gitea-server\n  export GITEA_TOKEN=your_token")
	}

	owner, repo, err := getOwnerRepo()
	if err != nil {
		return "", err
	}

	assignees := []string{}
	if *reviewer != "" {
		assignees = append(assignees, *reviewer)
	}

	result, err := postJSON(
		fmt.Sprintf("%s/api/v1/repos/%s/%s/pulls", host, owner, repo),
		map[string]string{"Authorization": "token " + token},
		map[string]any{
			"title":     *title,
			"body":      *body,
			"head":      *head,
			"base":      *base,
			"assignees": assignees,
		},
	)
	if err != nil {
		return "", err
	}

	prURL, _ := result["html_url"].(string)
	if prURL == "" {
		return "", fmt.Errorf("PR URL을 가져올 수 없습니다")
	}
	return prURL, nil
}

// ── GitHub (gh CLI 위임) ──────────────────────────────────────
func createGitHubPR() (string, error) {
	args := []string{
		"pr", "create",
		"--base", *base,
		"--head", *head,
		"--title", *title,
		"--body", *body,
	}
	if *reviewer != "" {
		args = append(args, "--reviewer", *reviewer)
	}

	out, err := exec.Command("gh", args...).Output()
	if err != nil {
		return "", fmt.Errorf("gh CLI 실행 실패: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	return lines[len(lines)-1], nil
}

// ── GitLab ────────────────────────────────────────────────────
func createGitLabPR() (string, error) {
	host := os.Getenv("GITLAB_HOST")
	if host == "" {
		host = "https://gitlab.com"
	}
	token := os.Getenv("GITLAB_TOKEN")

	if token == "" {
		return "", fmt.Errorf("GITLAB_TOKEN 환경변수가 설정되지 않았습니다.\n  export GITLAB_TOKEN=your_token")
	}

	owner, repo, err := getOwnerRepo()
	if err != nil {
		return "", err
	}

	projectPath := url.PathEscape(owner + "/" + repo)

	result, err := postJSON(
		fmt.Sprintf("%s/api/v4/projects/%s/merge_requests", host, projectPath),
		map[string]string{"PRIVATE-TOKEN": token},
		map[string]any{
			"source_branch": *head,
			"target_branch": *base,
			"title":         *title,
			"description":   *body,
		},
	)
	if err != nil {
		return "", err
	}

	prURL, _ := result["web_url"].(string)
	if prURL == "" {
		return "", fmt.Errorf("MR URL을 가져올 수 없습니다")
	}
	return prURL, nil
}
