set -ex
export BUILD_DIR=`pwd`
rm -rf ./divvun-ci-config || echo "No config to delete"
git clone --depth=1 https://github.com/divvun/divvun-ci-config.git
cd divvun-ci-config
sh ./install-macos.sh
sh ./install.sh