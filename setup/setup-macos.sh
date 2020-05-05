set -ex
export TRAVIS_BUILD_DIR="$(pwd)"
cd ..
git clone --depth=1 https://github.com/divvun/divvun-ci-config.git
cd divvun-ci-config
sh ./install-macos.sh
