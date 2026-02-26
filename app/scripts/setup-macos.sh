#!/bin/bash
# Self.xyz macOS Development Environment Setup
# Usage: ./scripts/setup-macos.sh [--check-only] [--yes]

set -e

trap 'err "Setup failed at line $LINENO: $BASH_COMMAND"' ERR

# Config
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DIR="$REPO_ROOT/app"
RUBY_VERSION=$(cat "$APP_DIR/.ruby-version" 2>/dev/null | tr -d '[:space:]')
NODE_VERSION=$(cat "$REPO_ROOT/.nvmrc" 2>/dev/null | tr -d '[:space:]')
NODE_VERSION=${NODE_VERSION:-22.22.0}
NODE_MAJOR=${NODE_VERSION%%.*}
COCOAPODS_VERSION=$(grep -E '^    cocoapods \\(' "$APP_DIR/Gemfile.lock" 2>/dev/null | head -1 | sed -E 's/.*\\(([^)]+)\\).*/\\1/')
BUNDLER_VERSION=$(grep -A 1 '^BUNDLED WITH$' "$APP_DIR/Gemfile.lock" 2>/dev/null | tail -n 1 | tr -d '[:space:]')

# Args (can be overridden interactively)
CHECK_ONLY=false; AUTO_YES=false
for arg in "$@"; do
  case $arg in
    --check-only) CHECK_ONLY=true ;;
    --yes|-y) AUTO_YES=true ;;
    --interactive|-i) ;; # default behavior
  esac
done

# Colors
R='\033[31m' G='\033[32m' Y='\033[33m' B='\033[34m' C='\033[36m' NC='\033[0m' BOLD='\033[1m'

ok()   { echo -e "${G}✓${NC} $1"; }
err()  { echo -e "${R}✗${NC} $1"; }
warn() { echo -e "${Y}⚠${NC} $1"; }
info() { echo -e "${C}ℹ${NC} $1"; }

confirm() {
  $AUTO_YES && return 0
  read -p "$1 [Y/n] " -n 1 -r; echo
  [[ ! $REPLY =~ ^[Nn]$ ]]
}

init_rbenv_shell() {
  command -v rbenv &>/dev/null || return 0
  # Avoid failing when the project's Ruby version is not installed yet.
  eval "$(rbenv init - --no-rehash 2>/dev/null)" || true
}

load_shell_env() {
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  init_rbenv_shell
}

# Check functions - return "ok:version" or "missing" or "wrong:version"
chk_brew()    { command -v brew &>/dev/null && echo "ok:$(brew --version | head -1 | cut -d' ' -f2)" || echo "missing"; }
chk_nvm()     { [[ -s "$HOME/.nvm/nvm.sh" ]] && echo "ok" || echo "missing"; }
chk_node()    {
  command -v node &>/dev/null && {
    v=$(node -v 2>/dev/null | tr -d 'v')
    if [[ "$NODE_VERSION" == *.* ]]; then
      [[ -n "$v" && "$v" == "$NODE_VERSION" ]] && echo "ok:$v" || echo "wrong:$v"
    else
      [[ -n "$v" && "${v%%.*}" -ge $NODE_MAJOR ]] && echo "ok:$v" || echo "wrong:$v"
    fi
  } || echo "missing"
}
chk_watch()   { command -v watchman &>/dev/null && echo "ok:$(watchman --version 2>/dev/null)" || echo "missing"; }
chk_rbenv()   { command -v rbenv &>/dev/null && echo "ok" || echo "missing"; }
chk_ruby() {
  if command -v rbenv &>/dev/null; then
    rbenv versions --bare 2>/dev/null | grep -q "^${RUBY_VERSION}" && echo "ok:$RUBY_VERSION" || echo "missing"
  else
    command -v ruby &>/dev/null && { v=$(ruby -v 2>/dev/null | cut -d' ' -f2); [[ "$v" == "$RUBY_VERSION"* ]] && echo "ok:$v" || echo "wrong:$v"; } || echo "missing"
  fi
}
chk_pods() {
  command -v pod &>/dev/null || { echo "missing"; return; }
  v=$(pod --version 2>/dev/null) || { echo "missing"; return; }
  [[ -n "$v" ]] || { echo "missing"; return; }
  [[ -n "$COCOAPODS_VERSION" && "$v" != "$COCOAPODS_VERSION" ]] && echo "wrong:$v" || echo "ok:$v"
}
chk_bundler() {
  command -v bundle &>/dev/null || { echo "missing"; return; }
  v=$(bundle -v 2>/dev/null | awk '{print $3}') || { echo "missing"; return; }
  [[ -n "$v" ]] || { echo "missing"; return; }
  [[ -n "$BUNDLER_VERSION" && "$v" != "$BUNDLER_VERSION" ]] && echo "wrong:$v" || echo "ok:$v"
}
chk_java()    { command -v java &>/dev/null && { v=$(java -version 2>&1 | head -1 | cut -d'"' -f2); [[ "$v" == 17* ]] && echo "ok:$v" || echo "wrong:$v"; } || echo "missing"; }
chk_xcode()   { xcode-select -p &>/dev/null && [[ "$(xcode-select -p)" == *Xcode.app* ]] && echo "ok" || echo "missing"; }
chk_studio()  { [[ -d "/Applications/Android Studio.app" ]] && echo "ok" || echo "missing"; }
chk_sdk()     { [[ -d "${ANDROID_HOME:-$HOME/Library/Android/sdk}" ]] && echo "ok" || echo "missing"; }
chk_ndk()     { [[ -d "${ANDROID_HOME:-$HOME/Library/Android/sdk}/ndk/28.0.13004108" ]] && echo "ok" || echo "missing"; }
chk_shell()   { local rc=~/.zshrc; [[ "$SHELL" == *bash* ]] && rc=~/.bashrc; grep -q "ANDROID_HOME" "$rc" 2>/dev/null && echo "ok" || echo "missing"; }
chk_yarn() {
  command -v yarn &>/dev/null || { echo "missing"; return; }
  v=$(yarn -v 2>/dev/null)
  [[ -n "$v" && "${v%%.*}" -ge 4 ]] && echo "ok:$v" || echo "wrong:$v"
}
chk_swiftlint() { command -v swiftlint &>/dev/null && echo "ok:$(swiftlint version 2>/dev/null | head -1)" || echo "missing"; }

# Install functions
inst_brew()    { /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; }
inst_nvm()     { curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash; export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; }
inst_node()    {
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  if ! command -v nvm &>/dev/null; then
    err "nvm not available after install"
    return 1
  fi
  nvm install "$NODE_VERSION"
  nvm alias default "$NODE_VERSION" >/dev/null 2>&1 || true
}
inst_watch()   { brew install watchman; }
inst_rbenv()   { brew install rbenv; init_rbenv_shell; }
inst_ruby()    { init_rbenv_shell; rbenv install -s "$RUBY_VERSION"; rbenv global "$RUBY_VERSION"; rbenv rehash; }
inst_pods()    {
  if command -v rbenv &>/dev/null; then
    init_rbenv_shell
    rbenv shell "$RUBY_VERSION" 2>/dev/null || true
    if [[ -n "$COCOAPODS_VERSION" ]]; then
      rbenv exec gem install cocoapods -v "$COCOAPODS_VERSION"
    else
      rbenv exec gem install cocoapods
    fi
  else
    if [[ -n "$COCOAPODS_VERSION" ]]; then
      gem install cocoapods -v "$COCOAPODS_VERSION"
    else
      gem install cocoapods
    fi
  fi
}
inst_bundler() {
  if command -v rbenv &>/dev/null; then
    init_rbenv_shell
    rbenv shell "$RUBY_VERSION" 2>/dev/null || true
    if [[ -n "$BUNDLER_VERSION" ]]; then
      rbenv exec gem install bundler -v "$BUNDLER_VERSION"
    else
      rbenv exec gem install bundler
    fi
  else
    if [[ -n "$BUNDLER_VERSION" ]]; then
      gem install bundler -v "$BUNDLER_VERSION"
    else
      gem install bundler
    fi
  fi
}
inst_java()    { brew install openjdk@17; sudo ln -sfn "$(brew --prefix openjdk@17)/libexec/openjdk.jdk" /Library/Java/JavaVirtualMachines/openjdk-17.jdk 2>/dev/null || true; }
inst_yarn()    {
  if command -v corepack &>/dev/null; then
    corepack enable
    corepack prepare yarn@stable --activate
  else
    err "corepack not available; ensure Node.js is installed and on PATH"
    return 1
  fi
}
inst_swiftlint() { brew install swiftlint; }

inst_shell() {
  local rc=~/.zshrc
  [[ "$SHELL" == *bash* ]] && rc=~/.bashrc

  # Check if already configured
  if grep -q "# Self.xyz Dev Environment" "$rc" 2>/dev/null; then
    ok "Shell already configured"
    return 0
  fi

  local jdk_path
  jdk_path="$(brew --prefix openjdk@17 2>/dev/null || echo /opt/homebrew/opt/openjdk@17)"

  info "Adding environment to $rc..."
  cat >> "$rc" << EOF

# Self.xyz Dev Environment
export JAVA_HOME=\$(/usr/libexec/java_home -v 17 2>/dev/null || echo "")
export PATH="$jdk_path/bin:\$PATH"
export ANDROID_HOME=~/Library/Android/sdk
export ANDROID_SDK_ROOT=\$ANDROID_HOME
export PATH=\$PATH:\$ANDROID_HOME/emulator:\$ANDROID_HOME/platform-tools
command -v rbenv &>/dev/null && eval "\$(rbenv init - --no-rehash)"
export NVM_DIR="\$HOME/.nvm"; [ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"
EOF
  ok "Shell configured. Run: source $rc"
}

# Main
echo -e "\n${C}${BOLD}═══ Self.xyz macOS Setup ═══${NC}\n"

# Interactive mode selection (if no flags provided)
if [[ "$CHECK_ONLY" == false && "$AUTO_YES" == false ]]; then
  echo "How would you like to run the setup?"
  echo ""
  echo "  1) Check only - just show what's installed/missing"
  echo "  2) Interactive setup - check and confirm before installing (recommended)"
  echo "  3) Auto-install - install everything without prompts"
  echo ""
  read -p "Enter choice [1]: " -n 1 -r choice
  echo ""
  case $choice in
    2) ;; # interactive setup
    3) AUTO_YES=true ;;
    *) CHECK_ONLY=true ;; # default: check only
  esac
  echo ""
fi

# Define deps: name|check_fn|install_fn|manual_msg
DEPS=(
  "Homebrew|chk_brew|inst_brew|"
  "nvm|chk_nvm|inst_nvm|"
  "Node.js $NODE_VERSION|chk_node|inst_node|"
  "Yarn|chk_yarn|inst_yarn|"
  "Watchman|chk_watch|inst_watch|"
  "rbenv|chk_rbenv|inst_rbenv|"
  "Ruby $RUBY_VERSION|chk_ruby|inst_ruby|"
  "CocoaPods|chk_pods|inst_pods|"
  "Bundler|chk_bundler|inst_bundler|"
  "Java 17|chk_java|inst_java|"
  "Xcode|chk_xcode||Install from App Store: https://apps.apple.com/app/xcode/id497799835"
  "Android Studio|chk_studio||Download: https://developer.android.com/studio"
  "Android SDK|chk_sdk||Open Android Studio → SDK Manager"
  "Android NDK|chk_ndk||SDK Manager → SDK Tools → NDK 28.0.13004108"
  "SwiftLint|chk_swiftlint|inst_swiftlint|"
  "Shell Config|chk_shell|inst_shell|"
)

MISSING=()
MANUAL=()
FAILED=()

info "Checking dependencies...\n"
load_shell_env
for dep in "${DEPS[@]}"; do
  IFS='|' read -r name chk inst manual <<< "$dep"
  status=$($chk)

  if [[ "$status" == ok* ]]; then
    ver="${status#ok:}"; [[ -n "$ver" && "$ver" != "ok" ]] && ok "$name ($ver)" || ok "$name"
  elif [[ "$status" == wrong* ]]; then
    ver="${status#wrong:}"; [[ -n "$ver" ]] && err "$name - wrong version ($ver)" || err "$name - wrong version"
    if [[ -n "$inst" ]]; then
      MISSING+=("$name|$inst")
    elif [[ -n "$manual" ]]; then
      MANUAL+=("$name|$manual")
    fi
  elif [[ -n "$manual" ]]; then
    warn "$name - manual install required"
    MANUAL+=("$name|$manual")
  else
    err "$name - not installed"
    [[ -n "$inst" ]] && MISSING+=("$name|$inst")
  fi
done

$CHECK_ONLY && {
  [[ ${#MANUAL[@]} -gt 0 ]] && { echo -e "\n${Y}Manual installs:${NC}"; for m in "${MANUAL[@]}"; do IFS='|' read -r n msg <<< "$m"; echo "  $n: $msg"; done; }
  exit 0
}

# Install missing
if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo -e "\n${B}Missing:${NC} $(printf '%s\n' "${MISSING[@]}" | cut -d'|' -f1 | tr '\n' ', ' | sed 's/, $//')"
  if confirm "Install all?"; then
    for m in "${MISSING[@]}"; do
      IFS='|' read -r name fn <<< "$m"
      info "Installing $name..."
      if $fn; then
        ok "$name installed"
      else
        err "Failed: $name"
        FAILED+=("$name")
      fi
    done
  fi
fi

# Manual instructions
[[ ${#MANUAL[@]} -gt 0 ]] && { echo -e "\n${Y}Manual installs needed:${NC}"; for m in "${MANUAL[@]}"; do IFS='|' read -r n msg <<< "$m"; echo "  $n: $msg"; done; }

# Yarn install
echo ""
if confirm "Run 'yarn install' in repo root?"; then
  if ! command -v yarn &>/dev/null; then
    err "yarn not available; run 'corepack enable && corepack prepare yarn@stable --activate' and retry"
  else
    info "Running yarn install..."
    set +e  # Temporarily disable exit-on-error
    cd "$REPO_ROOT" && yarn install
    yarn_exit=$?
    set -e  # Re-enable exit-on-error

    if [[ $yarn_exit -eq 0 ]]; then
      ok "Done!"
    else
      err "Yarn install failed (exit code: $yarn_exit)"
      warn "This may be due to network issues or registry timeouts"
      info "Try running manually: cd $REPO_ROOT && yarn install"
    fi
  fi
fi

if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo -e "\n${R}${BOLD}Setup finished with failures:${NC} ${FAILED[*]}"
  echo -e "Please fix the above issues and re-run the script."
  exit 1
fi

echo -e "\n${G}${BOLD}Setup complete!${NC}"
echo -e "Next steps:"
echo -e "  1) Open a new terminal and run: source ~/.zshrc (or ~/.bashrc)"
echo -e "  2) Install dependencies: cd $REPO_ROOT && yarn install"
echo -e "  3) Run the app: cd $APP_DIR && yarn ios (or yarn android)"
echo -e "  4) If Metro cache issues: cd $APP_DIR && yarn start:clean\n"
