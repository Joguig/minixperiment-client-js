#!/usr/bin/env bash
set -e

# Create a new ES5 release of this project
MODULE_FORMAT=""
while getopts ":m:" opt; do
	case $opt in
		m)
			MODULE_FORMAT="${OPTARG}"
			;;
		\?)
			echo "Invalid option: -${OPTARG}" >&2
			exit 1
			;;
	esac
done

TEMP_BRANCH="release-transpiled-`git rev-parse --verify HEAD`"
CURRENT_BRANCH=`git rev-parse --abbrev-ref HEAD`
PACKAGE_VERSION=`node -e "console.log(require('./package.json').version)"`
PUBLISH_VERSION="v${PACKAGE_VERSION}-${MODULE_FORMAT}"

function finish {
	# go back to the user's original branch
	git reset --hard
	git checkout "${CURRENT_BRANCH}"

	# destroy the temporary branch
	git branch -D "${TEMP_BRANCH}"
}

trap finish EXIT

# check out a branch new branch to avoid polluting `master`
git checkout -b "${TEMP_BRANCH}"

case "${MODULE_FORMAT}" in
	amd)
		grunt build:amd
		;;
	umd)
		grunt build:umd
		;;
	\?)
		echo "Invalid module format: ${MODULE_FORMAT}" >&2
		exit 1
		;;
esac

# update package.json with the -es5 version
npm --no-git-tag-version version "${PUBLISH_VERSION}"

# commit the changes
git add dist/
git commit -am "Release ${PUBLISH_VERSION}"

# create version tag
git tag -a "${PUBLISH_VERSION}" -m "Release ${PUBLISH_VERSION}"
