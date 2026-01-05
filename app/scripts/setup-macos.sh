#!/bin/bash
# Self.xyz macOS Development Environment Setup
# Usage: ./scripts/setup-macos.sh [--check-only] [--yes]

set -e

# Config
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DIR="$REPO_ROOT/app"
RUBY_VERSION=$(cat "$APP_DIR/.ruby-version" 2>/dev/null | tr -d '[:space:]')
NODE_MAJOR=22

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

# Check functions - return "ok:version" or "missing" or "wrong:version"
chk_brew()    { command -v brew &>/dev/null && echo "ok:$(brew --version | head -1 | cut -d' ' -f2)" || echo "missing"; }
chk_nvm()     { [[ -s "$HOME/.nvm/nvm.sh" ]] && echo "ok" || echo "missing"; }
chk_node()    { command -v node &>/dev/null && { v=$(node -v 2>/dev/null | tr -d 'v'); [[ -n "$v" && "${v%%.*}" -ge $NODE_MAJOR ]] && echo "ok:$v" || echo "wrong:$v"; } || echo "missing"; }
chk_watch()   { command -v watchman &>/dev/null && echo "ok:$(watchman --version 2>/dev/null)" || echo "missing"; }
chk_rbenv()   { command -v rbenv &>/dev/null && echo "ok" || echo "missing"; }
chk_ruby()    { command -v ruby &>/dev/null && { v=$(ruby -v 2>/dev/null | cut -d' ' -f2); [[ "$v" == "$RUBY_VERSION"* ]] && echo "ok:$v" || echo "wrong:$v"; } || echo "missing"; }
chk_pods()    { command -v pod &>/dev/null && echo "ok:$(pod --version 2>/dev/null)" || echo "missing"; }
chk_bundler() { command -v bundle &>/dev/null && echo "ok" || echo "missing"; }
chk_java()    { command -v java &>/dev/null && { v=$(java -version 2>&1 | head -1 | cut -d'"' -f2); [[ "$v" == 17* ]] && echo "ok:$v" || echo "wrong:$v"; } || echo "missing"; }
chk_xcode()   { xcode-select -p &>/dev/null && [[ "$(xcode-select -p)" == *Xcode.app* ]] && echo "ok" || echo "missing"; }
chk_studio()  { [[ -d "/Applications/Android Studio.app" ]] && echo "ok" || echo "missing"; }
chk_sdk()     { [[ -d "${ANDROID_HOME:-$HOME/Library/Android/sdk}" ]] && echo "ok" || echo "missing"; }
chk_ndk()     { [[ -d "${ANDROID_HOME:-$HOME/Library/Android/sdk}/ndk/27.0.12077973" ]] && echo "ok" || echo "missing"; }
chk_shell()   { local rc=~/.zshrc; [[ "$SHELL" == *bash* ]] && rc=~/.bashrc; grep -q "ANDROID_HOME" "$rc" 2>/dev/null && echo "ok" || echo "missing"; }

# Install functions
inst_brew()    { /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; }
inst_nvm()     { curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash; export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; }
inst_node()    { export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; nvm install $NODE_MAJOR; }
inst_watch()   { brew install watchman; }
inst_rbenv()   { brew install rbenv; eval "$(rbenv init -)"; }
inst_ruby()    { eval "$(rbenv init -)" 2>/dev/null; rbenv install "$RUBY_VERSION"; rbenv rehash; }
inst_pods()    { gem install cocoapods; }
inst_bundler() { gem install bundler; }
inst_java()    { brew install openjdk@17; sudo ln -sfn "$(brew --prefix openjdk@17)/libexec/openjdk.jdk" /Library/Java/JavaVirtualMachines/openjdk-17.jdk 2>/dev/null || true; }

inst_shell() {
  local rc=~/.zshrc
  [[ "$SHELL" == *bash* ]] && rc=~/.bashrc

  # Check if already configured
  if grep -q "# Self.xyz Dev Environment" "$rc" 2>/dev/null; then
    ok "Shell already configured"
    return 0
  fi

  info "Adding environment to $rc..."
  cat >> "$rc" << 'EOF'

# Self.xyz Dev Environment
export JAVA_HOME=$(/usr/libexec/java_home -v 17 2>/dev/null || echo "")
export ANDROID_HOME=~/Library/Android/sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
command -v rbenv &>/dev/null && eval "$(rbenv init -)"
export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
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
  "Node.js $NODE_MAJOR|chk_node|inst_node|"
  "Watchman|chk_watch|inst_watch|"
  "rbenv|chk_rbenv|inst_rbenv|"
  "Ruby $RUBY_VERSION|chk_ruby|inst_ruby|"
  "CocoaPods|chk_pods|inst_pods|"
  "Bundler|chk_bundler|inst_bundler|"
  "Java 17|chk_java|inst_java|"
  "Xcode|chk_xcode||Install from App Store: https://apps.apple.com/app/xcode/id497799835"
  "Android Studio|chk_studio||Download: https://developer.android.com/studio"
  "Android SDK|chk_sdk||Open Android Studio → SDK Manager"
  "Android NDK|chk_ndk||SDK Manager → SDK Tools → NDK 27.0.12077973"
  "Shell Config|chk_shell|inst_shell|"
)

MISSING=()
MANUAL=()

info "Checking dependencies...\n"
for dep in "${DEPS[@]}"; do
  IFS='|' read -r name chk inst manual <<< "$dep"
  status=$($chk)

  if [[ "$status" == ok* ]]; then
    ver="${status#ok:}"; [[ -n "$ver" && "$ver" != "ok" ]] && ok "$name ($ver)" || ok "$name"
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
      $fn && ok "$name installed" || err "Failed: $name"
    done
  fi
fi

# Manual instructions
[[ ${#MANUAL[@]} -gt 0 ]] && { echo -e "\n${Y}Manual installs needed:${NC}"; for m in "${MANUAL[@]}"; do IFS='|' read -r n msg <<< "$m"; echo "  $n: $msg"; done; }

# Yarn install
echo ""
if confirm "Run 'yarn install' in repo root?"; then
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

echo -e "\n${G}${BOLD}Setup complete!${NC} Open a new terminal, then: cd $APP_DIR && yarn ios\n"
