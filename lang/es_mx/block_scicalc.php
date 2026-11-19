<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Language strings for block_scicalc (Mexican Spanish).
 *
 * @package   block_scicalc
 * @copyright 2026 Eduardo Kraus {@link https://eduardokraus.com}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['calculator'] = 'Calculadora';
$string['clear_history'] = 'Borrar historial';
$string['close'] = 'Cerrar calculadora';
$string['cursorleft'] = 'Mover el cursor a la izquierda';
$string['cursorright'] = 'Mover el cursor a la derecha';
$string['display'] = 'Pantalla de la calculadora';
$string['displayplaceholder'] = 'p. ej. 6.02E23';
$string['editinghint'] = 'Los estudiantes tienen un botón flotante de Calculadora durante cada intento de cuestionario en este curso. No aparece en ningún otro lugar. Esta nota solo se muestra en modo de edición.';
$string['error_arity_mismatch'] = 'Número de argumentos no válido.';
$string['error_factorial_overflow'] = 'El factorial superó el límite numérico.';
$string['error_generic'] = 'Error al evaluar la expresión.';
$string['error_invalid_expression'] = 'No se pudo calcular porque la expresión está escrita '
    . 'en un formato que la calculadora no reconoce '
    . '(revise los paréntesis, los signos y nombres como <code>sin</code>/<code>sqrt</code>). '
    . 'Ponga <code>*</code> entre números y paréntesis, p. ej. <code>2*(3+4)</code>.';
$string['error_mismatched_parentheses'] = 'Los paréntesis no coinciden.';
$string['error_misplaced_comma'] = 'Coma en una posición no válida.';
$string['error_negative_factorial'] = 'No se puede calcular el factorial de un número negativo.';
$string['error_non_finite_result'] = 'El resultado de este cálculo fue infinito o no es un número (NaN). '
    . 'Compruebe que no está dividiendo entre cero ni usando algo como la raíz cuadrada de un número negativo.';
$string['error_non_integer_factorial'] = 'El factorial solo está definido para números enteros.';
$string['error_stack_underflow'] = 'Falta un número o un argumento. '
    . 'P. ej.: <code>2*</code>, <code>2 + ( )</code>, <code>2 +</code>, '
    . '<code>sin()</code> sin valor, <code>pow(2)</code> sin el 2.º argumento.';
$string['error_unclosed_function_call'] = 'Llamada a función sin cerrar.';
$string['error_unknown_identifier'] = 'Nombre desconocido. Use <code>e</code> minúscula para el número de Euler y <code>E</code> solo para potencias de diez, p. ej. <code>6.02E23</code>.';
$string['error_unknown_token'] = 'Símbolo desconocido.';
$string['error_unsupported_function'] = 'Función no admitida.';
$string['error_zero_argument_function_call'] = 'Llamada a función sin argumentos.';
$string['history_title'] = 'Historial';
$string['invalid_expression'] = 'Expresión no válida';
$string['key_abs'] = 'Valor absoluto';
$string['key_ans'] = 'Respuesta anterior';
$string['key_backspace'] = 'Borrar el último carácter';
$string['key_clear'] = 'Borrar';
$string['key_divide'] = 'Dividir';
$string['key_epower'] = 'e elevado a';
$string['key_equals'] = 'Igual';
$string['key_exponent'] = 'Por diez elevado a';
$string['key_ln'] = 'Logaritmo natural';
$string['key_log'] = 'Logaritmo en base 10';
$string['key_minus'] = 'Menos';
$string['key_multiply'] = 'Multiplicar';
$string['key_negate'] = 'Cambiar signo';
$string['key_nthroot'] = 'Raíz enésima';
$string['key_plus'] = 'Más';
$string['key_point'] = 'Punto decimal';
$string['key_power'] = 'Elevado a';
$string['key_reciprocal'] = 'Recíproco';
$string['key_sqrt'] = 'Raíz cuadrada';
$string['key_square'] = 'Al cuadrado';
$string['key_tenpower'] = 'Diez elevado a';
$string['pluginname'] = 'Calculadora científica';
$string['privacy:metadata'] = 'El bloque Calculadora científica no almacena ningún dato personal en el servidor. '
    . 'El historial de cálculos se guarda solo en el localStorage del navegador.';
$string['quizsetting'] = 'Mostrar la calculadora durante los intentos';
$string['quizsetting_help'] = 'Los estudiantes tienen una calculadora científica flotante mientras resuelven este cuestionario, siempre que el bloque Calculadora científica se haya agregado a este curso. Desmarque esta opción en los cuestionarios donde no se permiten calculadoras.';
$string['scicalc:addinstance'] = 'Agregar un nuevo bloque Calculadora científica';
$string['scicalc:myaddinstance'] = 'Agregar un bloque Calculadora científica a Mi inicio';
