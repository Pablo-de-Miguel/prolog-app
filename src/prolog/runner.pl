:- use_module(library(http/json)).
:- use_module(library(sandbox)).
:- initialization(main, main).

main(Argv) :-
  catch(run(Argv), Error, emit_error(Error)).

run([File, QueryText, LimitText]) :-
  atom_number(LimitText, Limit),
  setup_call_cleanup(open(File, read, Stream, [encoding(utf8)]), load_clauses(Stream), close(Stream)),
  term_string(Query, QueryText, [variable_names(Names), module(user_program)]),
  sandbox:safe_goal(user_program:Query),
  ProbeLimit is Limit + 1,
  findnsols(ProbeLimit, Names, user_program:Query, AllRows),
  take_limit(AllRows, Limit, Rows, Limited),
  maplist(bindings_json, Rows, Solutions),
  reply_json_dict(_{solutions:Solutions, limited:Limited}).

load_clauses(Stream) :-
  read_term(Stream, Term, [module(user_program)]),
  ( Term == end_of_file -> true
  ; Term = (:- _) -> throw(error(permission_error(load, directive, Term), _))
  ; assertz(user_program:Term), load_clauses(Stream)
  ).

take_limit(Rows, Limit, Taken, Limited) :-
  length(Prefix, Limit),
  ( append(Prefix, [_|_], Rows) -> Taken = Prefix, Limited = true
  ; Taken = Rows, Limited = false
  ).

bindings_json([], _{}).
bindings_json(Pairs, Dict) :-
  maplist(binding_pair, Pairs, JsonPairs),
  dict_pairs(Dict, bindings, JsonPairs).

binding_pair(Name=Value, Name-Text) :-
  term_string(Value, Text, [quoted(true), numbervars(true)]).

emit_error(Error) :-
  message_to_string(Error, Technical),
  error_kind(Error, Kind, Friendly),
  reply_json_dict(_{error:_{kind:Kind, message:Friendly, details:Technical}}).

error_kind(error(syntax_error(_), _), syntax, 'Hay un error de sintaxis. Revisa paréntesis, comas y puntos finales.') :- !.
error_kind(error(existence_error(procedure, _), _), query, 'La consulta usa un predicado que no está definido.') :- !.
error_kind(error(permission_error(call, sandboxed, _), _), security, 'La consulta intenta realizar una operación no permitida por seguridad.') :- !.
error_kind(error(permission_error(load, directive, _), _), security, 'No se permiten directivas. Escribe solo hechos y reglas.') :- !.
error_kind(_, prolog, 'SWI-Prolog no pudo ejecutar la consulta.').
