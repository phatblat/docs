---
title: "Rust"
sidebar_position: 8
pagination_prev: intro
pagination_next: concepts/overview
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Create a new project with `cargo init --bin` and add the following to your `Cargo.toml` file.

```toml
[dependencies.dittolive-ditto]
version = "1.0"
```

```console
cargo build
```

## Suggested App Filesystem Structure

Rust doesn't prescribe any particular structure for your project's layout on the end user's device filesystem. The following is one recommendation

* `AppRoot/AppExecutable` - The path of your app's executable. Everything else should be relative to this. The binary component of Ditto may optionally be statically linked into this executable (default).
* `AppRoot/libdittoffi.dll` -  The path to the binary ditto library if using the shared library version. Configure your app's linker to search for the library here (e.g. `@executable_path/../libdittoffi.dylib`). You will need to copy this shared library from `target/<profile>/build/dittolive-ditto-sys<hash>/out` when distributing your app.
* `AppRoot/ditto_data/` - Base directory for all locally stored Ditto data.


## Cross Compiling with the Ditto Rust SDK

The rust compiler is natively capable of cross-compiling for a wide range of targets. You will need to configure a local `.cargo/config.toml` file in the root of your project directory to provide the necessary `rustc`, linker, and potentially C compiler arguements. For most targets you will need to provide an alternative sysroot for your target (not host) platform, often exposing a POSIX C library, header files, binutils, and a linker.

## Common Issues

### I get an error: "error: could not find native static library `dittoffi`, perhaps an -L flag is missing". What should I do?

#### Diagnosis
The Ditto SDK build.rs script failed to download an appropriate ditto binary for your target platform. Check your internet connection is live and Ditto version number is correct. Inspect the downloaded library in the cargo build cache (default is `target/<profile>/build/dittolive-ditto-sys-<hash>/out/libdittoffi.{a,dylib,so,dll}`) using your platforms utilties such as `file`, `otool`, `readelf` or similar. Try updating to the latest release of `dittolive-ditto`. You can also manually download the binary yourself.

#### Solutions

1. Try updating to a more recent version of `dittolive-ditto` .
2. Manually download the library yourself and verify it completes successfully.
3. Force the build script to look for the library in a specific directory by exporting `DITTOFFI_SEARCH_PATH` during compilation and execution.
