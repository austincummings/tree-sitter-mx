const PREC = {
  group: 21,
  member: 19,
  comptime_call: 18,
  call: 17,
  fn_proto: 16, // Add precedence for function prototypes
  tuple: 15, // Tuple expressions have high precedence in Rust
  unary: 14,
  range: 13,
  multiplicative: 12, // *, /, %
  additive: 11, // +, -
  shift: 10, // <<, >>
  binary_and: 9, // &
  binary_xor: 8, // ^
  binary_or: 7, // |
  comparison: 6, // ==, !=, <, >, <=, >=
  logical_and: 4, // and
  logical_or: 3, // or
  // struct: 2,
};

module.exports = grammar({
  name: "mx",

  word: ($) => $.identifier,

  extras: ($) => [/\s/, $.line_comment],

  conflicts: ($) => [[$._expr, $.comptime_expr]],

  rules: {
    source_file: ($) => optional($._stmt_list),

    // Declarations

    _decl: ($) =>
      seq(
        choice(
          $.struct_decl,
          $.interface_decl,
          $.fn_decl,
          $.var_decl,
          $.const_decl,
        ),
      ),

    fn_decl: ($) => seq(field("proto", $.fn_proto), field("body", $.block)),

    fn_proto: ($) =>
      prec(
        PREC.fn_proto,
        seq(
          "fn",
          field("name", optional($.identifier)),
          optional(
            seq("[", field("comptime_params", optional($.param_list)), "]"),
          ),
          "(",
          field("params", optional($.param_list)),
          ")",
          ":",
          field("return_type", $.comptime_expr),
        ),
      ),

    var_decl: ($) =>
      seq(
        "var",
        field("name", $.identifier),
        optional(seq(":", field("type", $.comptime_expr))),
        optional(seq("=", field("value", $._expr))),
        ";",
      ),

    const_decl: ($) =>
      seq(
        "const",
        field("name", $.identifier),
        optional(seq(":", field("type", $.comptime_expr))),
        seq("=", field("value", $.comptime_expr)),
        ";",
      ),

    struct_decl: ($) =>
      seq(
        "struct",
        field("name", $.identifier),
        optional(seq("[", field("comptime_params", $.param_list), "]")),
        field("body", choice($.block, ";")),
      ),

    interface_decl: ($) =>
      seq(
        "interface",
        field("name", $.identifier),
        optional(seq("[", field("comptime_params", $.param_list), "]")),
        field("body", $.interface_body),
      ),

    interface_body: ($) => seq("{", repeat1(seq($.fn_proto, ";")), "}"),

    // Statements

    _stmt: ($) =>
      choice(
        $.break_stmt,
        $.continue_stmt,
        $.return_stmt,
        $.if_stmt,
        $.loop_stmt,
        $.assign_stmt,
        $.expr_stmt,
      ),

    _stmt_list: ($) => repeat1(choice($._stmt, $._decl)),

    expr_stmt: ($) => seq(field("expr", $._expr), field("semi", ";")),

    break_stmt: ($) => seq("break", field("semi", ";")),

    continue_stmt: ($) => seq("continue", field("semi", ";")),

    return_stmt: ($) =>
      seq("return", field("expr", $._expr), field("semi", ";")),

    if_stmt: ($) =>
      seq(
        "if",
        field("condition", $._expr),
        field("then", $.block),
        field("else", optional(seq("else", choice($.block, $.if_stmt)))),
      ),

    loop_stmt: ($) => seq("loop", field("body", $.block)),

    assign_stmt: ($) =>
      seq(
        field("lhs", $._expr),
        "=",
        field("rhs", $._expr),
        field("semi", ";"),
      ),

    // Expressions

    _expr: ($) =>
      choice(
        $.unary_expr,
        $.binary_expr,
        $.comptime_expr,
        $.range_expr,
        $._primary_expr,
      ),

    comptime_expr: ($) =>
      field(
        "expr",
        choice(
          $.unary_expr,
          $.binary_expr,
          $.fn_proto,
          $.comptime_call_expr,
          $._primary_expr,
        ),
      ),

    _primary_expr: ($) =>
      choice(
        $.int_literal,
        $.float_literal,
        $.string_literal,
        $.multiline_string_literal,
        $.bool_literal,
        $.list_literal,
        $.map_literal,
        $.call_expr,
        $.member_expr,
        $.variable_expr,
        $.group_expr,
        $.block,
        $.tuple_expr,
      ),

    member_expr: ($) =>
      prec(
        PREC.member,
        seq(field("expr", $._expr), ".", field("member", $.identifier)),
      ),

    variable_expr: ($) => field("name", $.identifier),

    group_expr: ($) => prec(PREC.group, seq("(", $._expr, ")")),

    range_expr: ($) =>
      prec(
        PREC.range,
        seq(field("from", $._primary_expr), "to", field("to", $._primary_expr)),
      ),

    unary_expr: ($) =>
      prec(
        PREC.unary,
        seq(field("op", choice("-", "not")), field("expr", $._expr)),
      ),

    binary_expr: ($) =>
      choice(
        prec.left(
          PREC.additive,
          seq(
            field("left", $._expr),
            field("op", "+"),
            field("right", $._expr),
          ),
        ),
        prec.left(
          PREC.additive,
          seq(
            field("left", $._expr),
            field("op", "-"),
            field("right", $._expr),
          ),
        ),
        prec.left(
          PREC.multiplicative,
          seq(
            field("left", $._expr),
            field("op", "*"),
            field("right", $._expr),
          ),
        ),
        prec.left(
          PREC.multiplicative,
          seq(
            field("left", $._expr),
            field("op", "/"),
            field("right", $._expr),
          ),
        ),
        prec.left(
          PREC.logical_and,
          seq(
            field("left", $._expr),
            field("op", "and"),
            field("right", $._expr),
          ),
        ),
        prec.left(
          PREC.logical_or,
          seq(
            field("left", $._expr),
            field("op", "or"),
            field("right", $._expr),
          ),
        ),
        prec.left(
          PREC.shift,
          seq(
            field("left", $._expr),
            field("op", "<<"),
            field("right", $._expr),
          ),
        ),
        prec.left(
          PREC.shift,
          seq(
            field("left", $._expr),
            field("op", ">>"),
            field("right", $._expr),
          ),
        ),
        prec.left(
          PREC.binary_and,
          seq(
            field("left", $._expr),
            field("op", "&"),
            field("right", $._expr),
          ),
        ),
        prec.left(
          PREC.binary_xor,
          seq(
            field("left", $._expr),
            field("op", "^"),
            field("right", $._expr),
          ),
        ),
        prec.left(
          PREC.binary_or,
          seq(
            field("left", $._expr),
            field("op", "|"),
            field("right", $._expr),
          ),
        ),
        prec.left(
          PREC.comparison,
          seq(
            field("left", $._expr),
            field("op", "=="),
            field("right", $._expr),
          ),
        ),
        prec.left(
          PREC.comparison,
          seq(
            field("left", $._expr),
            field("op", "!="),
            field("right", $._expr),
          ),
        ),
        prec.left(
          PREC.comparison,
          seq(
            field("left", $._expr),
            field("op", ">"),
            field("right", $._expr),
          ),
        ),
        prec.left(
          PREC.comparison,
          seq(
            field("left", $._expr),
            field("op", ">="),
            field("right", $._expr),
          ),
        ),
        prec.left(
          PREC.comparison,
          seq(
            field("left", $._expr),
            field("op", "<"),
            field("right", $._expr),
          ),
        ),
        prec.left(
          PREC.comparison,
          seq(
            field("left", $._expr),
            field("op", "<="),
            field("right", $._expr),
          ),
        ),
      ),

    comptime_call_expr: ($) =>
      prec.right(
        PREC.comptime_call,
        seq(
          field("callee", choice($._primary_expr)),
          seq("[", field("comptime_args", $.args_list), "]"),
        ),
      ),

    call_expr: ($) =>
      prec(
        PREC.call,
        seq(
          field("callee", $.comptime_expr),
          "(",
          field("args", optional($.args_list)),
          ")",
        ),
      ),

    block: ($) => seq("{", optional($._stmt_list), field("end", "}")),

    tuple_expr: ($) =>
      prec(
        PREC.tuple,
        choice(
          // Empty tuple: ()
          seq("(", ")"),
          // Single-element tuple: (x,) or (a: x,)
          seq("(", $.tuple_field, ",", ")"),
          // Multi-element tuple: (x, y, ...) or (a: x, b: y, ...) - requires at least two elements
          seq(
            "(",
            $.tuple_field,
            ",",
            $.tuple_field,
            optional(seq(repeat(seq(",", $.tuple_field)), optional(","))),
            ")",
          ),
        ),
      ),

    tuple_field: ($) =>
      seq(
        optional(seq(field("name", $.identifier), ":")),
        field("value", $._expr),
      ),

    int_literal: ($) => /\d+/,

    float_literal: ($) => /\d+\.\d+/,

    string_literal: ($) =>
      seq(
        '"',
        repeat(
          choice($.string_fragment, $.string_interpolation, $.escape_sequence),
        ),
        '"',
      ),

    multiline_string_literal: ($) =>
      seq(
        '"""',
        repeat(
          choice(
            $.line_terminator,
            $.escape_sequence,
            $.string_interpolation,
            $.multiline_string_fragment,
          ),
        ),
        '"""',
      ),

    line_terminator: (_) => choice(seq(/\n/, /\r/, /\\u2028/, /\\u2029/)),

    string_fragment: (_) => token.immediate(/[^"\\\r\n${}]+/),

    multiline_string_fragment: (_) => token.immediate(/[^"\\${}]+/),

    escape_sequence: (_) =>
      token.immediate(
        seq(
          "\\",
          choice(
            /[^xu0-7]/,
            /[0-7]{1,3}/,
            /x[0-9a-fA-F]{2}/,
            /u[0-9a-fA-F]{4}/,
            /u\{[0-9a-fA-F]+\}/,
            /[\r?][\n\u2028\u2029]/,
          ),
        ),
      ),

    string_interpolation: ($) => seq("${", $._expr, "}"),

    bool_literal: ($) => choice("true", "false"),

    list_literal: ($) =>
      seq(
        "[",
        field("exprs", optional(seq($._expr, repeat(seq(",", $._expr))))),
        "]",
      ),

    map_literal: ($) =>
      seq(
        "map",
        "{",
        field("pairs", optional(seq($.kv_pair, repeat(seq(",", $.kv_pair))))),
        "}",
      ),

    kv_pair: ($) => seq(field("key", $._expr), ":", field("value", $._expr)),

    // Misc

    line_comment: ($) => token(seq("//", /.*/)),

    param_list: ($) => seq($.param, repeat(seq(",", $.param)), optional(",")),

    param: ($) => seq(field("name", $.identifier), ":", field("type", $._expr)),

    args_list: ($) => seq($.arg, repeat(seq(",", $.arg)), optional(",")),

    arg: ($) =>
      seq(
        optional(seq(field("name", $.identifier), ":")),
        field("value", $._expr),
      ),

    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,
  },
});
