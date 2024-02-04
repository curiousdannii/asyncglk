Differences between GlkApi and the C Glk API
============================================

There are a few differences between GlkApi and the [C Glk API](https://eblong.com/zarf/glk/Glk-Spec-075.html). The GlkApi versions are here described as Typescript functions.

Array parameters
----------------

When a function needs an array the C API takes a pointer and a length. One example is `glk_request_line_event`.

```c
void glk_request_line_event(winid_t win, char *buf, glui32 maxlen, glui32 initlen);
```

GlkApi instead takes only one parameter, which is an array of maxlen length. This can be a typed array, or a normal array.

```ts
type GlkByteArray = Array<number> | Uint8Array
glk_request_line_event(win: GlkWindow, buf: GlkByteArray, initlen?: number): void
```

String functions
----------------

String functions like `glk_put_string` go one step further, and need the string array to be pre-converted to a JS string.

```c
void glk_put_string(char *s);
```

```ts
glk_put_string(val: string): void
```

Structs and out parameters
--------------------------

The C API naturally support structs, as well as out parameters:

```c
void glk_current_time(glktimeval_t *time);
void glk_window_get_size(winid_t win, glui32 *widthptr, glui32 *heightptr);
```

The GlkApi versions take either a `RefStruct` or a `RefBox`. You can read the fields of a `RefStruct` with `get_field(index: number)`, and the value of a `RefBox` with `get_value()`.

```ts
glk_current_time(struct: RefStruct): void
glk_window_get_size(win: GlkWindow, width?: RefBox, height?: RefBox): void,
```

`glk_fileref_create_by_prompt`
----------------------------

The C API version of `glk_fileref_create_by_prompt` is synchronous: you call it, and (from the perspective of your code) immediately get back the response.

The GlkApi version is asynchronous: control will be passed to GlkOte, and once the file reference has been created `VM.resume` will be called again, with the fref as the first (and only) argument. If the VM uses GiDispa then the fref is also returned through it. The `VM.resume` function must be written such that it can handle being called after either `glk_fileref_create_by_prompt` or `glk_select`.