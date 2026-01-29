jQuery UI DownloadBuilder & ThemeRoller backend and frontend application.

## Requirements
- [node >=18 and npm](https://nodejs.org/en/download/)
- ImageMagick 7.x. ([See below for instructions how to install it](#install-imagemagick))
- grunt-cli: `npm install -g grunt-cli`

## Getting Started

Install node modules.
```
$ npm install
```

Prepare the releases (declared in `config.json`) and build the frontend js bundles.
```
$ grunt prepare
```

Run the server.
```
$ node server.js --console
```

Go to the URL it outputs.

## Development

### config.json

Use the config file to define which jQueryUI version DownloadBuilder should serve. Eg:
```
"jqueryUi": [
  {
    "version": "1.14.2"
    "dependsOn": "jQuery 1.12+ / 2.2+ / 3.6+ / 4.0+",
    "label": "Stable",
    "stable": true
  },
  {
    "version": "1.13.3"
    "dependsOn": "jQuery 1.8 - 4.0+",
    "label": "Legacy"
  }
}
```

One version with the `stable` property set to `true` is required. Each release has the following attributes:
- `version` is a String, can be a tag or a branch of jQuery UI. Note: use `repo/branch` eg. `origin/master` when defining a branch.
- `dependsOn` is a String, any textual value allowed.
- `label` is a boolean, describing the lifecycle of this version, like "Stable", "Legacy" or "Beta".
- `stable` is a boolean, marking the current stable release. This will be selected by default in the web UI and will be used to generate demo files.


### node server.js

Use `node server.js` to run the server. Arguments:
- `--host=<name>` specify custom host. Default localhost;
- `--nocache` skip caching release files and theme images;
- `--port=<number>` specify custom port. Default 8088;


### Test

Use `npm test` to run the unit tests.


## Local testing in WordPress

Here's how to do integration testing with WordPress:

Link your local `download.jqueryui.com` module on `jqueryui.com`.
```sh
$ cd <local download.jqueryui.com path>
$ npm link
$ node server.js --console

$ cd <local jqueryui.com path>
$ npm link download.jqueryui.com
```

Temporarily change its `Gruntfile.js` to use localhost instead of https://download.jqueryui.com.
```diff
                var frontend = require( "download.jqueryui.com" ).frontend({
-                               host: "https://download.jqueryui.com"
+                               host: "http://localhost:8088",
                                env: "production"
                        }),
```

Then deploy:
```sh
$ grunt deploy
```

## Appendix

### Install ImageMagick

You will need ImageMagic `7.x` with PNG support. If your distribution doesn't provide such a version (on macOS it is included in the `imagemagick` Homebrew package), you will need to compile ImageMagick from source.

Follow instructions from https://imagemagick.org/script/install-source.php to install ImageMagic `7.x`. Then, in the ImageMagick directory, invoke:
```
$ ./configure CFLAGS=-O5 CXXFLAGS=-O5 --prefix=/opt --enable-static --with-png --disable-shared
```

Make sure you have the below in the output.
```
PNG               --with-png=yes		yes
```

If "png=yes no", `libpng` is missing and needs to be installed, `apt-get install libpng-dev` on linux or `brew install libpng` on macOS.

Continuing...
```
$ make -j5 && sudo make install
export MAGICK_HOME="/opt"
export PATH="$MAGICK_HOME/bin:$PATH"
export LD_LIBRARY_PATH="$MAGICK_HOME/lib/"
export DYLD_LIBRARY_PATH="$MAGICK_HOME/lib/"
```

Make sure you get the right bin when running it.
```
$ which magick
/opt/bin/magick
```

Hint: add those export statements into your `.bash_profile`.
