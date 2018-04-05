$(document).ready(function() {
    
    A = []; // Arreglo que va a tener las annotaciones, de la forma {"ini":1, "fin":3, "uri":["http://example.org/enriry1","http://example.org/enriry2"], "tag":"ex:type1", "id_sentence":1}
    Sentences = []; // Lista de oraciones del documento
    n = 0; // tamaño del texto
    idSentence2dicc = {}; // tiene por cada oración el uri correspondiente
    temp_annotation = {};

    warning_alert = function(text){
	BootstrapDialog.show({
            title: 'Information',
            message: text,
            buttons: [ {
                label: 'Ok',
                action: function(dialog) {
                    dialog.close();
                }
            }]
        });
    }


    isNumber = function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    replaceAll = function(str, term, replacement){
            return str.replace(new RegExp(term, 'g'), replacement);
    }

    
    function CleanAnnotationDocument() {
        for (i in Sentences){
            Sentences.splice(0,Sentences.length)
            A.splice(0,A.length)
            $("#nifdoc").html("");
	    $("#sentencesDoc").html("");
        }
    }



    $("#btn_1_split").click(function(){
 
         var text = $("#inDoc").val();
         //var res = replaceAll(text,/\s\s+/i, ' ');
         //#res = replaceAll(res,/\.[^0123456789]/i, "\.\n");
         var res = "";
         var len = text.length;
         var anterior = 'a';
         var state = 0;
         for (var i = 0; i < len; i++) {
             if (state == 0){  // anterior normal
                 if (text[i] == '.'){
                    //alert("1");
                    /*if (anterior == anterior.toUpperCase()){
                        res = res + ".";
                        console.log("a -->"+res);
                    }
                    else */
                    if (i != len && (text[i+1]>='0' && text[i+1]<='9') ){ // si el siguiente es un número
                        res = res + ".";
                        //console.log("b ->" + res);
                    }
                    else{
                        res = res + ".\n";
                        //console.log("c -->" + res);
                    }
                 }
                 else if (text[i] == " " || text[i] == "\t" || text[i] == "\n"){  // si es un espacio no lo pongo, para eliminar espacios en blanco repetidos etc
                     state = 1;
                     //console.log("d -->" + res);
                 }
                 else{
                     res = res + text[i];
                     //console.log("e -->" + res);
                 }
             }
             else if (state == 1){ //anterior un espacio, cambio de línea o tabulador que no puse, toca ponerlo
                 //alert("2");
                 if (text[i] == " " || text[i] == "\t" || text[i] == "\n"){
                    //nada
                    //console.log("2-a -->" + res );
                 }
                 else if (text[i] == '.'){
                    res = res + ".\n"; 
                    state = 0;
                    //console.log("2-b -->" + res);
                 }
                 else {
                    if (res[res.length - 1] == "\n"){  // porque sino las oraciones empiezan con un espacio al inicio
                        res = res + text[i];
                    }
                    else {
                        res = res + " "+text[i];
                    }
                    state = 0;
                    //console.log("2-c -->" + res);
                 }
                
             }
             anterior = text[i];
		 }
         $("#inDoc").val(res);
         $(this).prop( "disabled", true ); //Disable
         $("#btn_2_acept_sent").prop( "disabled", false ); //Enable
    });

    $("#btn_2_acept_sent").click(function(){
        $("#divShow").removeClass("hide");

 
        $("#inDoc").prop("readonly",true);
        //$("#inIdDoc").prop("readonly",true);

        $(this).prop( "disabled", true ); //Disable
        $("#btn_1_split").prop( "disabled", true ); //Disable
        $("#btn_3_annotation").prop( "disabled", false ); //Enable
	$("#btn_4_annotation").prop( "disabled", false ); //Enable
        
        CreateSentenceList(); // creo la lista de oraciones
        buildNIFCorpora(); // actualizo los div de visualizar (anotaciones en texto plano y NIF)
    });

    // Esta función busca a que id de sentencia pertenece esa posicion
    sent2id = function(pos){
        overall = 0;
        for (i in Sentences){
            sent = Sentences[i];
            overall = overall + sent.length+1;
            if (pos < overall){
                return i;
            }
        }
    }


    // Miro si hay solapamiento (conflicto) con algunas de las annotaciones existentes
    existsOverlapping = function(ann){
        ini = ann["ini"];
        fin = ann["fin"];
        for (i in A){
            a = A[i]
            //if ( (a["ini"] <= ini  && ini <= a["fin"]) ||  (a["ini"] <= fin  && fin <= a["fin"])){return true;}
            if (!(    ( (a["ini"]<ini && a["ini"]<fin) && (a["fin"]<ini && a["fin"]<fin) )   ||   ( (ini<a["ini"] && ini<a["fin"]) && (fin<a["ini"] && fin<a["fin"]) )  )){return true;}
            //if (!(a["fin"]<ini && fin<a["ini"])){
            //    
            //}
            
        }
        return false;
    }
    
    // Miro si ya existe esa misma anotacion
    ItIsRepetition = function(ann){
        ini = ann["ini"];
        fin = ann["fin"];
        for (i in A){
            a = A[i]
            if (a["ini"]==ini && a["fin"]==fin){return true;}
        }
        return false;
    }

    // Cuando doy click en el boton de annotar
    $("#btn_3_annotation").click(function(){
        remove_input_uris();
        var txtArea = document.getElementById("inDoc");
        var selectedText;   
        var startPosition;
        var endPosition;
        if (txtArea.selectionStart == txtArea.selectionEnd){
             warning_alert("You should select one entity mention");		    
            return 0;
        }
        //alert(txtArea.selectionStart.toString()+" - "+txtArea.selectionEnd.toString());
        if (txtArea.selectionStart != undefined) {    
            startPosition = txtArea.selectionStart;
            endPosition = txtArea.selectionEnd;
            selectedText = txtArea.value.substring(startPosition, endPosition);
        } else{
            warning_alert("You should select one entity mention - undefined position");
            return 0; 
        }
        temp_annotation = {   // esta variable global la voy a completar cuando  llene el URI y a taxonomia en el modal
             "ini":startPosition,
             "fin":endPosition,
             "id_sentence":sent2id(startPosition),
             "label":selectedText
        };
        //Deselecciono
        txtArea.selectionStart = 0;
        txtArea.selectionEnd = 0;
        $("#inDoc").focus();


        

        var dif = 20;
        var label_show =  selectedText; // Esta variable se mostrar en el header de la modal
        if (startPosition - dif > 0 &&  endPosition + dif < n){
            label_show = "...<i>"+txtArea.value.substring(startPosition-dif, startPosition) + 
                         "</i><b>"+selectedText+"</b><i>"+
                         txtArea.value.substring(endPosition, endPosition+dif)+"</i>...";
        }
        
        if (existsOverlapping(temp_annotation)){
            if (ItIsRepetition(temp_annotation)){
                warning_alert("This mention is already annotated.");
                return 0; 
            }
            label_show = label_show + "<p class=\"text-danger\">This entity is overlapped with other mention.</p>";
        }
        
        nselect = selectedText.length;
        if (selectedText[0] == " " || selectedText[0] == "\n" || selectedText[0] == "\t" || selectedText[nselect-1] == " " || selectedText[nselect-1] == "\n" || selectedText[nselect-1] == "\t"){
            label_show = label_show + "<p class=\"text-danger\">The first/last character must not belong to the surface form, you must to close this annotation and select the correct surface form.</p>";
        }

        $("#myModal-title-desc").html(label_show);
        var listTaxonomy = undefined;
        //var inputTaxonomy = $("#taxonomyInput").val();
        var listInputTaxonomy = $("#taxonomyInput").select2('data'); //devuelve algo asi [{…}, {…}]
                                                                 //                   0: {id: 2, text: "nerd:Airline"},
                                                                 //                   1: {id: "ddd", text: "ddd"}

        var taxonomy = []; // el select2 version 4 permite entrar valores, pero esos se toman como string, 
                                     // y los otros iniciales como el numero identificador del string.. así que aqui llevo los id a valores
        $("#modalSelectTaxonomy").empty();
        select = document.getElementById('modalSelectTaxonomy');
        if (listInputTaxonomy.length != 0){
            for (i in listInputTaxonomy){
                v = listInputTaxonomy[i];
                option = document.createElement('option');
                option.value = i;
                option.text = v["text"];
                select.add(option);
            }
            //console.log(listTaxonomy);
  
        } 
        //else{alert("no seleccionaron nada en la taxonomia");}

        $("#modalSelectURI").val("");
        document.getElementById('modalSelectTaxonomy').selectedIndex = -1;
        $('#myModal').modal("show");
        $('#myModal').on('shown.bs.modal', function () {
            $("#modalSelectURI").focus();
        });
    });


    //---------- Annotate Button -------------------------
    remove_input_uris = function(){
      $('.taIdentRefContainer').each(function() {
          $(this).remove();
      });
    }

    $("#btn_annotate").click(function(){ 
        /*var in_uri = $("#modalSelectURI").val();
        if (!in_uri){
            warning_alert("Debe de entrar una URI");
            return 0;
        }
        else {*/
            //
            // get the list of uris added
            var list_uri = [];
            $('.taIdentRef').each(function() {
                var text = $(this).val();
                if (text!=""){
                    list_uri.push(text);
                }
                
            });

            var in_uri = $("#modalSelectURI").val();
            if (in_uri){
                list_uri.push(in_uri);
            }
               
            if (list_uri.length == 0){
                warning_alert("Debe de entrar una URI");
                return 0;
            }
            
            temp_annotation["uri"] = list_uri;
            
            
            if ($("#modalSelectTaxonomy").val()){
                //console.log(' $("#modalSelectTaxonomy").text():', $("#modalSelectTaxonomy").text());
                var listInputTaxonomy = $("#taxonomyInput").select2('data');
                var tag_text = listInputTaxonomy[$("#modalSelectTaxonomy").val()]["text"];
                //console.log("******>>>"+tag_text);
                temp_annotation["tag"] = tag_text;//$("#modalSelectTaxonomy").text();
            }
        //}
        temp_annotation["idA"] = A.length;
        A.push(temp_annotation);
       $('#myModal').modal("hide"); 
       buildNIFCorpora();
       remove_input_uris();
    });



    //---------- select del div
    /*
    if (!window.x) {
		x = {};
	}

	x.Selector = {};
	x.Selector.getSelected = function() {
		var t = '';
		if (window.getSelection) {
		    t = window.getSelection();
		} else if (document.getSelection) {
		    t = document.getSelection();
		} else if (document.selection) {
		    t = document.selection.createRange().text;
		}
		return t;
	}

	$(document).ready(function() {
		$(document).bind("mouseup", function() {
		    var mytext = x.Selector.getSelected();
		    alert(mytext);
		});
	});*/


    //----------- construcción del corpus

    // Esta función crea la lista de Sentencias por unica vez
    CreateSentenceList = function(){
         var text = $("#inDoc").val();
         Sentences = text.split("\n");
         n = text.length;
    };


    // crea el NIF del documento: header y context
    buildContext = function(){
       var res = "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n"+
                 "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n"+
                 "@prefix owl: <http://www.w3.org/2002/07/owl#> .\n"+
                 "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n"+
                 "@prefix nif: <http://persistence.uni-leipzig.org/nlp2rdf/ontologies/nif-core#> .\n"+
                 "@prefix itsrdf: <http://www.w3.org/2005/11/its/rdf#> .\n"+
                 "@prefix dbo: <http://dbpedia.org/ontology/> .\n\n";

       var text = $("#inDoc").val();
       text = replaceAll(text,"\n"," ");
       var urldoc = $("#inIdDoc").val();
       if (!urldoc){
           warning_alert("The corpora URI is empty");
           urldoc = "https://example.org";
           $("#inIdDoc").addClass("has-error");
           //$("#inIdDoc").addClass("form-group");
       }
       var ndoc = text.length.toString();
       res = res + "<"+urldoc+"#char=0,"+ndoc+">\n"+
        "        a nif:String , nif:Context  , nif:RFC5147String ;\n"+
        "        nif:isString \"\"\""+text+"\"\"\"^^xsd:string ;\n"+
        "        nif:beginIndex \"0\"^^xsd:nonNegativeInteger ;\n"+
        "        nif:endIndex \""+ndoc+"\"^^xsd:nonNegativeInteger ;\n"+
        "        nif:sourceUrl <"+urldoc+"> .\n\n";
                    
       final_res = replaceAll(res,"<","&lt;");
       final_res = replaceAll(final_res,"<","&gt;");
       final_res = replaceAll(final_res,"\n","<br>");
       final_res = replaceAll(final_res," ","&nbsp;");
       
       //update Content Summary
       $("#info_numbersentences").html(Sentences.length.toString());
       $("#info_numberannotations").html(A.length.toString());
       $("#info_numbercaracters").html(text.length.toString());
       return final_res;
    };


    // obtengo la lista de anotaciones de una oración especificada en forma ordenada
    getSentencesAnnotations = function(ids){
        var SortedList = []; // Lista ordenada de las annotaciones según la posicion inicial de cada una
        var temp = [];
        for (i in A){
            ann = A[i];
            //console.log("------ ");
            //console.log(ann);
            //console.log("id_sentence:",ann["id_sentence"],"  ids:",ids);
            if (ann["id_sentence"] == ids){
               //insertar la annotación en su posición, que quede ordenado el arreglo por la posición inicial
               //supongo que ya SortedList esta ordenado               
               var inserted = false;
               for (j in SortedList){ // voy poniendo "e" en "temp" hasta que le toque a "ann"
                   var index_j = parseInt(j);
                   e = SortedList[j];
                   if (ann["ini"]==e["ini"] && !inserted){ // ordeno segun "fin"
                       if (ann["fin"]==e["fin"]){
                           warning_alert("This entity has already added.");
                           return 0; 
                       }
                       if (SortedList.length-1 == index_j){// en caso de que "e" sea el último
                           inserted = true;
                           if (ann["fin"]<e["fin"]){
                               temp.push(ann);
                               temp.push(e);
                           }
                           else{
                               temp.push(e);
                               temp.push(ann);
                           }
                           inserted = true;
                       }
                       else{
                           var e2 = SortedList[index_j+1];
                           if (ann["fin"]<e2["fin"]){
                               temp.push(ann);
                               temp.push(e);
                               inserted = true;
                           }
                           else{
                               temp.push(e);
                           }
                       }
                   } else if (ann["ini"]<e["ini"] && !inserted){  // inserto primero ann, y después e
                       inserted = true;
                       temp.push(ann);
                       temp.push(e);
                   } 
                   else{
                       temp.push(e);
                   }
               }
               if (!inserted){
                   temp.push(ann);
               }
               SortedList = temp;
               temp = [];
            }
        }
        return SortedList;
    };

    
    // elimino una oracion y actualizo el NIF de salida
    delete_sentence = function(id_sent){
      BootstrapDialog.show({
            title: 'Erasing sentence',
            message: 'Are you sure you want to delete the sentence?',
            buttons: [{
                cssClass: 'btn-primary',
                label: 'Yes',
                action: function(dialog) {
                    delete_sentence_yes(id_sent);
                    dialog.close();
                }
            }, {
                label: 'No',
                action: function(dialog) {
                    dialog.close();
                }
            }]
        });
       
    }
    
    
    delete_sentence_yes = function(id_sent){
       //
       var sent = Sentences[id_sent];
       var n_sentence = sent.length;
       Sentences.splice(id_sent, 1);
       
       //Busco el id de las annotaciones de esa oracion
       var List_to_Erase = [];
       for (i in A){
           ann = A[i];
           if (parseInt(ann["id_sentence"]) == parseInt(id_sent)){
              //A.splice(i, 1);
              List_to_Erase.push(i);
           }
           else if (parseInt(ann["id_sentence"]) > parseInt(id_sent)){ //actualizo el id
              ann["id_sentence"] = ann["id_sentence"] - 1;
              ann["ini"] = ann["ini"] - n_sentence-1;
              ann["fin"] = ann["fin"] - n_sentence-1;
           }
        }
        
        // ordeno las ids para entonces eliminar de atras para adelante, ya que se modifican los ids cada vez que uno se elimina
        List_to_Erase.sort(function(a, b){return b-a});
        console.log(List_to_Erase);
        
        // Elimino las annotaciones de esa oración
        for (e in List_to_Erase){
            ida = List_to_Erase[e];
            A.splice(ida, 1);
        }
        
        // Actualizo los ids que tienen ls annotaciones sobre ellas mismas
        for (i in A){
            ann = A[i];
            ann["idA"] = i;
        }
        
        
        
        // update main text
        var newText = "";
        for (i in Sentences)
        {
            newText = newText + Sentences[i] + "\n"; 
        }
        
        $("#inDoc").val(newText);
        
        // update views
        buildNIFCorpora();
    };
    
    
    
    

    // actualizo las anotaciones de las oraciones y actualizo el div de visualización
    updateAnnotatedSentHTML = function(){
         var textOut = "";

         var ini;
         var fin;
         var label;
         var overall = 0;
         
         for (i in Sentences){
             sent = Sentences[i];
             var temp_i = parseInt(i);
  
             
             textOut = textOut + '<div class="div_parent"><div class="right-wrapper"><div class="right"><div style="width: 100%;padding-left:10px;">';

             //
             var SentencesAnnotations = getSentencesAnnotations(i); // obtengo la lista de anotaciones de la oración actual de forma ordenada
             if (SentencesAnnotations.length != 0){
                 var pos = 0;
                 for (j in SentencesAnnotations){
                     var index = parseInt(j);
                     //console.log(SentencesAnnotations.length);
                     ann = SentencesAnnotations[j];
                     //console.log("-->",ann);
                     var ini = ann["ini"] - overall;
                     var fin = ann["fin"] - overall;
                     if (index+1 < SentencesAnnotations.length){ // si no es el ultimo, y además, hay overlapping
                         //console.log(SentencesAnnotations);
                         //console.log(index);
                         var ann2 = SentencesAnnotations[index+1];
                         if (ann["fin"]>ann2["ini"]){
                             fin = ann2["ini"] - overall;
                             ann["overlap"] = true;
                             ann2["overlap"] = true;
                             console.log("OPTT");
                         }
                     }
                     label = sent.substring(ini, fin);

                     var st = "";
                     if ("tag" in ann){
                         if (ann["tag"] == "tax:Ambiguous"){
                             st = 'style="background-color: #5cb85c;"';
                         }
                     }
                     if ("overlap" in ann){
                         if (ann["overlap"] == true){
                             st = 'style="background-color: #88783a;"';
                         }
                         ann["overlap"] = false;
                     }
                     httpAnnotation = '<span ide="'+ann["idA"]+'"  class="blueLabel classlabelAnnotation"  data-toggle="tooltip" title="'+ann["uri"].join()+'" '+st+'>'+label+'</span>';
                     textOut = textOut + sent.substring(pos,ini) + httpAnnotation;
                     pos = fin;
                 }  
                 textOut = textOut + sent.substring(pos,sent.length)+"<br>&nbsp;";
             }
             else{
                 textOut = textOut + sent +"<br>&nbsp;";
             }
             //textOut = textOut + "<br><br>";
             var temp_i_plus_1 = temp_i +1;
             textOut = textOut + '</div></div></div>'+ 
             '<div class="left div_line"> &nbsp;'+temp_i_plus_1.toString()+
             " <a href='javascript:delete_sentence("+temp_i.toString()+")'><i style='color:red!important;' class='fa fa-trash'></i></a>"+
             '</div></div>';
             overall = overall+sent.length+1;
         }
         $("#sentencesDoc").html(textOut);
    };

    // Construyo las tripletas NIF de las oraciones
    updateAnnotatedSentNIF = function(){
        var res = "";
        var text = $("#inDoc").val();
        text = replaceAll(text,"\n"," ");
        var urldoc = $("#inIdDoc").val();
        if (!urldoc){
            urldoc = "https://example.org";
        }
        var ndoc = text.length.toString();

		//Pongo todas las sentencias en el NIF
        overall = 0;
        for (i in Sentences){
            var sent = Sentences[i];
            //console.log(i," ->",sent," (",sent.length,")");
            if (sent.length == 0  ||  (sent.length == 0 && (sent==" "||sent=="\n"||sent=="\t"))){continue;}
            var sent_ini = text.indexOf(sent);
            var nsent = sent.length;
            var sent_fin = sent_ini + nsent;
            var overall_t = overall.toString();
            var overallFinal= overall + nsent;
            var overallFinal_t = overallFinal.toString();
            var nifAnnotation;
            var ini_t;
            var fin_t;
            
            var sent_uri = "<"+urldoc+"#char="+overall_t+","+overallFinal_t+">";
            var s = sent_uri + "\n"+
                   "        a nif:String , nif:Context , nif:RFC5147String ;\n"+// "        a nif:String , nif:Sentence , nif:RFC5147String ;\n"+
                   "        nif:isString \"\"\""+sent+"\"\"\"^^xsd:string ;\n"+//"        nif:anchorOf \"\"\""+sent+"\"\"\"^^xsd:string ;\n"+
                   "        nif:beginIndex \""+overall_t+"\"^^xsd:nonNegativeInteger ;\n"+
                   "        nif:endIndex \""+overallFinal_t+"\"^^xsd:nonNegativeInteger ;\n"+
                   //"        nif:referenceContext <"+urldoc+"#char=0,"+ndoc+"> .\n\n"; ----->
                   "        nif:broaderContext <"+urldoc+"#char=0,"+ndoc+"> .\n\n";
            res = res + s;
            idSentence2dicc[i] = {"uri": sent_uri, "ini":sent_ini, "fin":sent_fin, "len":nsent};

            //Pongo todas las anotaciones de esta oración
            var SentencesAnnotations = getSentencesAnnotations(i); // obtengo la lista de anotaciones de la oración actual de forma ordenada
             //console.log("Arr:",SentencesAnnotations);
             if (SentencesAnnotations.length != 0){
                 for (j in SentencesAnnotations){
                     //console.log(SentencesAnnotations.length);
                     ann = SentencesAnnotations[j];
                     //console.log("-->",ann);
                     ini = ann["ini"] - overall;
                     fin = ann["fin"] - overall;
                     label = sent.substring(ini, fin);
                     
                     ini_t = ini.toString();
                     fin_t = fin.toString();
                     nifAnnotation = "<"+urldoc+"#char="+ini_t+","+fin_t+">\n" + 
                                     "        a nif:String , nif:Context , nif:Phrase , nif:RFC5147String ;\n"+
                                     //"        nif:Context "+sent_uri+" ;\n"+//"        nif:sentence "+sent_uri+" ;\n"+
                                     "        nif:referenceContext "+sent_uri+" ;\n"+//"        nif:sentence "+sent_uri+" ;\n"+
                                     //"        nif:referenceContext <"+urldoc+"#char=0,"+ndoc+"> ;\n"+
                                     "        nif:Context <"+urldoc+"#char=0,"+ndoc+"> ;\n"+
                                     "        nif:anchorOf \"\"\""+label+"\"\"\"^^xsd:string ;\n"+
                                     "        nif:beginIndex \""+ini_t+"\"^^xsd:nonNegativeInteger ;\n"+
                                     "        nif:endIndex \""+fin_t+"\"^^xsd:nonNegativeInteger ;\n";
                     if ("tag" in ann){
                         nifAnnotation = nifAnnotation + "        itsrdf:taClassRef "+ann["tag"]+" ;\n";
                     }
                     for (k in ann["uri"]){
                         var a_ = ann["uri"][k];
                         nifAnnotation = nifAnnotation + "        itsrdf:taIdentRef <"+a_+"> ";
                         if (k == ann["uri"].length-1){ //last
                             nifAnnotation = nifAnnotation + ".\n\n";
                         } else{nifAnnotation = nifAnnotation + ";\n";}
                     }
                     res = res + nifAnnotation;
                 }  
            }
            overall = overall + nsent +1;
        }
        final_res = replaceAll(res,"<","&lt;");
        final_res = replaceAll(final_res,"<","&gt;");
        final_res = replaceAll(final_res,"\n","<br>");
        final_res = replaceAll(final_res," ","&nbsp;");
        return final_res;
    };


    // crea el nif de las oraciones, y actualiza las anotaciones
    buildNIFSentences = function(){
        var res = "";
        updateAnnotatedSentHTML();
        return updateAnnotatedSentNIF();
    }
    

    //crea el nif de todo, documento, sentencias y sus anotaciones
    buildNIFCorpora = function(){
        nif = buildContext();
        nif = nif + buildNIFSentences();
        //$("#nifdoc").text(nif);
        document.getElementById('nifdoc').innerHTML = nif;
    };


   ///---------- select types (Select2) --------------------

   $("#taxonomyInput").select2({
    createSearchChoice:function(term, data) { 
        if ($(data).filter(function() { 
            return this.text.localeCompare(term)===0; 
        }).length===0) 
        {return {id:term, text:term};} 
    },
    multiple: true,
    //data: [{id: 0, text: 'nerd:Organization'},{id: 1, text: 'dbpo:Company'},{id: 2, text: 'task'}]
    data:[

        {id: 85,text: 'tax:Ambiguous'},
		{id: 0, text: 'nerd:AdministrativeRegion'},
		{id: 1, text: 'nerd:Aircraft'},
		{id: 2, text: 'nerd:Airline'},
		{id: 3, text: 'nerd:Airport'},
		{id: 4, text: 'nerd:Album'},
		{id: 5, text: 'nerd:Ambassador'},
		{id: 6, text: 'nerd:Amount'},
		{id: 7, text: 'nerd:Animal'},
		{id: 8, text: 'nerd:Architect'},
		{id: 9, text: 'nerd:Artist'},
		{id: 10, text: 'nerd:Astronaut'},
		{id: 11, text: 'nerd:Athlete'},
		{id: 12, text: 'nerd:Automobile'},
		{id: 13, text: 'nerd:Band'},
		{id: 14, text: 'nerd:Bird'},
		{id: 15, text: 'nerd:Book'},
		{id: 16, text: 'nerd:Bridge'},
		{id: 17, text: 'nerd:Broadcast'},
		{id: 18, text: 'nerd:Canal'},
		{id: 19, text: 'nerd:Celebrity'},
		{id: 20, text: 'nerd:City'},
		{id: 21, text: 'nerd:ComicsCharacter'},
		{id: 22, text: 'nerd:Company'},
		{id: 23, text: 'nerd:Continent'},
		{id: 24, text: 'nerd:Country'},
		{id: 25, text: 'nerd:Criminal'},
		{id: 26, text: 'nerd:Drug'},
		{id: 27, text: 'nerd:EducationalInstitution'},
		{id: 28, text: 'nerd:EmailAddress'},
		{id: 29, text: 'nerd:Event'},
		{id: 30, text: 'nerd:FictionalCharacter'},
		{id: 31, text: 'nerd:Function'},
		{id: 32, text: 'nerd:Holiday'},
		{id: 33, text: 'nerd:Hospital'},
		{id: 34, text: 'nerd:Insect'},
		{id: 35, text: 'nerd:Island'},
		{id: 36, text: 'nerd:Lake'},
		{id: 37, text: 'nerd:Legislature'},
		{id: 38, text: 'nerd:Lighthouse'},
		{id: 39, text: 'nerd:Location'},
		{id: 40, text: 'nerd:Magazine'},
		{id: 41, text: 'nerd:Mayor'},
		{id: 42, text: 'nerd:MilitaryConflict'},
		{id: 43, text: 'nerd:Mountain'},
		{id: 44, text: 'nerd:Movie'},
		{id: 45, text: 'nerd:Museum'},
		{id: 46, text: 'nerd:MusicalArtist'},
		{id: 47, text: 'nerd:Newspaper'},
		{id: 48, text: 'nerd:NonProfitOrganization'},
		{id: 49, text: 'nerd:OperatingSystem'},
		{id: 50, text: 'nerd:Organization'},
		{id: 51, text: 'nerd:Park'},
		{id: 52, text: 'nerd:Person'},
		{id: 53, text: 'nerd:PhoneNumber'},
		{id: 54, text: 'nerd:PoliticalEvent'},
		{id: 55, text: 'nerd:Politician'},
		{id: 56, text: 'nerd:Product'},
		{id: 57, text: 'nerd:ProgrammingLanguage'},
		{id: 58, text: 'nerd:RadioProgram'},
		{id: 59, text: 'nerd:RadioStation'},
		{id: 60, text: 'nerd:Restaurant'},
		{id: 61, text: 'nerd:River'},
		{id: 62, text: 'nerd:Road'},
		{id: 63, text: 'nerd:SchoolNewspaper'},
		{id: 64, text: 'nerd:ShoppingMall'},
		{id: 65, text: 'nerd:SoccerClub'},
		{id: 66, text: 'nerd:SoccerPlayer'},
		{id: 67, text: 'nerd:Software'},
		{id: 68, text: 'nerd:Song'},
		{id: 69, text: 'nerd:Spacecraft'},
		{id: 70, text: 'nerd:SportEvent'},
		{id: 71, text: 'nerd:SportsLeague'},
		{id: 72, text: 'nerd:SportsTeam'},
		{id: 73, text: 'nerd:Stadium'},
		{id: 74, text: 'nerd:Station'},
		{id: 75, text: 'nerd:TVStation'},
		{id: 76, text: 'nerd:TennisPlayer'},
		{id: 77, text: 'nerd:Thing'},
		{id: 78, text: 'nerd:Time'},
		{id: 79, text: 'nerd:URL'},
		{id: 80, text: 'nerd:University'},
		{id: 81, text: 'nerd:Valley'},
		{id: 82, text: 'nerd:VideoGame'},
		{id: 83, text: 'nerd:Weapon'},
		{id: 84, text: 'nerd:Website'}
    ]
    });

    //---- right buttons
    $("#btn_update").click(function(){
        buildNIFCorpora();
    });



    //---- uploaddddddd
    $("#btn_upload").click(function(){
        $("#modalUpload").modal("show");
    });

    /*
     http://plugins.krajee.com/file-basic-usage-demo
     $("#inputFile").fileinput({
        showPreview: false,
        showUpload: false,
        elErrorContainer: '#kartik-file-errors',
        allowedFileExtensions: ["jpg", "png", "gif"]
        //uploadUrl: '/site/file-upload-single'
    });*/


    $("#input-b9").fileinput({
        showPreview: false,
        showUpload: false,
        elErrorContainer: '#kartik-file-errors',
        allowedFileExtensions: ["ttl", "rdf"]
        //uploadUrl: '/site/file-upload-single'
    });

    var upload = function() {
		var photo = document.getElementById("fileNif");
		return false;
	};

    /*** probandoo
    file_temp = undefined;
    function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

    function receivedText() {
            showResult(fr, "Text");
        }
    function showResult(fr, label) {

        var result = fr.result;
	console.log(result);
	textFromUpload = result;
	CleanAnnotationDocument();
	$("#btn_inputNIF").click();
	//var htmle = Encoder.htmlEncode(result,true);
	//$("#nifdoc").html("BBB-->"+htmle);
	//textFromUpload = result;
    }

    function bodyAppend(tagName, innerHTML) {
        var elm;

        elm = document.createElement(tagName);
        elm.innerHTML = innerHTML;
        document.body.appendChild(elm);
    }

    
    **/

//e.target.
    //see https://www.html5rocks.com/en/tutorials/file/dndfiles/
	function readBlob(opt_startByte, opt_stopByte) {
		var files = document.getElementById('input-b9').files;
		if (!files.length) {
		  warning_alert('Please select a file!');
		  return;
		}

		var file = files[0];
		
		file_temp = file;		
		fr = new FileReader();
                //fr.onload = receivedText;
		fr.onload = function(e){
		    var result = e.target.result;
		    //console.log(result);
		    textFromUpload = e.target.result;
		    CleanAnnotationDocument();
		    $("#btn_inputNIF").click();
		}
                fr.readAsText(file);
	  }
	  
	  $('#modalUpload_upload').click(function(evt) {
         /*warning_alert("It's not working yet :(, you should try to copy/paste the nif content in the text area and apply the next button");
		/**/if (evt.target.tagName.toLowerCase() == 'button') {
		  var startByte = evt.target.getAttribute('data-startbyte');
		  var endByte = evt.target.getAttribute('data-endbyte');
		  readBlob(startByte, endByte);
		}
        $("#divShow").removeClass("hide");/**/
	  });


    //-------- download
    $("#btn_download").click(function(){
        /*BootstrapDialog.show({
            message: "It's not working yet :("
        });*/
        
	if ('Blob' in window) {
	  BootstrapDialog.show({
            message: '<label for="filename_input" class="col-form-label">File Name:</label> ' +
                     '<input type="text" class="form-control espacioAbajo" id="filename_input" '+
                     'placeholder="Name of the file">',
            title: 'File Name Input',
            buttons: [{
                label: 'Close',
                action: function(dialog) {
                    dialog.close();
                }
            }, {
                label: 'Ok',
                action: function(dialog) {
                    var fileName = $("#filename_input").val();
                    if (fileName) {
                        var htmlText = $('#nifdoc').html();
                        htmlText = replaceAll(htmlText,"&nbsp;"," ");
                        var textToWrite = Encoder.htmlDecode(replaceAll(htmlText,"<br>","\n"));
                        var textFileAsBlob = new Blob([textToWrite], { type: 'text/plain' });
                        if ('msSaveOrOpenBlob' in navigator) {
                            navigator.msSaveOrOpenBlob(textFileAsBlob, fileName);
                        } else {
                            var downloadLink = document.createElement('a');
                            downloadLink.download = fileName;
                            downloadLink.innerHTML = 'Download File';
                            if ('webkitURL' in window) {
                                // Chrome allows the link to be clicked without actually adding it to the DOM.
                                downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
                            } else {
                                // Firefox requires the link to be added to the DOM before it can be clicked.
                                downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
                                downloadLink.onclick = function(){};
                                downloadLink.style.display = 'none';
                                document.body.appendChild(downloadLink);
                            }
                        downloadLink.click();
                        }
                    }
                    dialog.close();
                }
            }]
        });
	  
	} else {
	  alert('Your browser does not support the HTML5 Blob.');
	}

    });



    if (!String.prototype.trim) {
	  String.prototype.trim = function () {
		return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
	  };
	}



    ///----
    // We suppose that the sentences are ordered
    textFromUpload = undefined;
    $("#btn_inputNIF").click(function(){
        var text = undefined;
	if (textFromUpload == undefined){
	  text = $("#inDoc").val();
	} else{
	  text = textFromUpload;
	  textFromUpload = undefined;
	}
        var L = text.split("\n");
        var chunk = "";
        var id_s = 0; 
        var uridoc = "";
        var sent_uri;
        var overall = 0;
        var sent_text;
        
        Sentences = [];
        for (i in L){
            var l_raw = L[i];
            var l = l_raw.trim();
            if (l.length == 0){
               continue;
            }

            if (l[l.length-1]!="."){
                // add to chunck
                chunk = chunk + l;
            }
            else { //end of the chunk
                chunk = chunk + l;
                var n_chunk = chunk.length;
                if (chunk.indexOf("nif:sourceUrl")!=-1){ // Document
                    var u_text = chunk.substring(p_ref, n_chunk);
                    var i_number = u_text.indexOf("<");
                    var p_number = u_text.indexOf("#");
                    if (p_number != -1){
                        uridoc = u_text.substring(i_number + 1,p_number); // 22
                    }
                    else {
                        var p_number = u_text.indexOf(">");
                        uridoc = u_text.substring(i_number + 1,p_number); // 8
                    }
                    $("#inIdDoc").val(uridoc);
                    chunk = "";
                    continue;
                }
                var p_ref = chunk.indexOf("nif:referenceContext");
                var p_bro = chunk.indexOf("nif:broaderContext");
                if (p_ref!=-1  || p_bro!=-1 ){  // it is a Setence or an Annotation (nif:Phrase)
                    if (chunk.indexOf("@prefix")!=-1){continue;}
                    if (chunk.indexOf("nif:Phrase")!=-1){  // It's an Annotation

                        // -- nif:beginIndex
                        var p_beginIndex = chunk.indexOf("nif:beginIndex");
                        if (p_beginIndex == -1){
                            console.log("--->> Error, there musts be a nif:beginIndex triple (start)");
                            continue;
                        }
                        
                        
                        var r_text = chunk.substring(p_beginIndex, n_chunk);
                        var fin_beginIndex = r_text.indexOf('"^^xsd:');
                        if (fin_beginIndex == -1){
                            console.log(chunk + "\n----------------\n");
                            console.log("--->> Error, there musts be a nif:beginIndex triple (end)");
                            continue;
                        }
                        var startPosition = r_text.substring(16,fin_beginIndex);

                        // -- nif:endIndex
                        var p_endIndex = chunk.indexOf("nif:endIndex");
                        if (p_endIndex == -1){
                            console.log("--->> Error, there musts be a nif:endIndex triple (start)");
                            continue;
                        }
                        
                        var r_text = chunk.substring(p_endIndex, n_chunk);
                        var fin_endIndex = r_text.indexOf('"^^xsd:');//('"^^xsd:nonNegativeInteger');
                        if (fin_endIndex == -1){
                            console.log("--->> Error, there musts be a nif:endIndex triple (end)");
                            continue;
                        }
                        var endPosition = r_text.substring(14,fin_endIndex);


                       //--- nif:anchorOf
                        var p_anchorOf = chunk.indexOf("nif:anchorOf");
                        if (p_anchorOf == -1){
                            console.log("--->> Error, there musts be a nif:anchorOf triple (start)");
                            continue;
                        }
                        
                        var r_text = chunk.substring(p_anchorOf, n_chunk);
                        var label = "";
                        var fin_anchorOf = r_text.indexOf('"""^^xsd:string');
                        if (fin_anchorOf == -1){
                            var fin_anchorOf = r_text.indexOf('"^^xsd:string');
                            if (fin_anchorOf == -1){
                                console.log(chunk);
                                console.log("r_text:"+r_text);
                                console.log("--->> Error, there musts be a nif:anchorOf triple (end)");
                                continue;
                            }
                            label = r_text.substring(14,fin_anchorOf);
                            console.log("label:"+label);
                        }
                        else {
                            label = r_text.substring(16,fin_anchorOf);
                        }



                        //uri itsrdf:taIdentRef
                        var p_taIdentRef = chunk.indexOf("itsrdf:taIdentRef");
                        if (p_taIdentRef == -1){
                            console.log("--->> Error, there musts be a nif:taIdentRef triple (start)");
                            continue;
                        }
                        
                        // get the list of links
                        var list_uri = [];
                        var r_text = chunk.substring(p_taIdentRef, n_chunk);
                        var terminate = false;
                        while (!terminate){
                            var fin_taIdentRef = r_text.indexOf('>');
                            if (fin_taIdentRef == -1){
                                console.log("--->> Error, there musts be a nif:taIdentRef triple (end)");
                                continue;
                            }
                            else{
                                var uri = "";
                                if (r_text[0]=="<"){ // other object for the same predicate
                                    uri = r_text.substring(1,fin_taIdentRef);
                                }
                                else{
                                    uri = r_text.substring(19,fin_taIdentRef);                                    
                                }
                                list_uri.push(uri);
                            }
                            
                            // what's next, either ',' , itsrdf:taIdentRef ?? , or other predicate
                            var k = fin_taIdentRef+1;
                            while (k<r_text.length && r_text[k]==" "){
                                k = k +1;
                            }
                            
                            if (r_text[k] == ","){                                
                                var p_ini = r_text.indexOf('<');
                                if (p_ini == -1){
                                    console.log("--->> Error, there musts be a nif:taIdentRef triple (end-1)");
                                    continue;
                                }
                                else{
                                    r_text = chunk.substring(p_taIdentRef+k, n_chunk);
                                }
                            }
                            else if (r_text[k] == ";"){ // then it is other predicate, we will se if there are other itsrdf:taIdentRef
                                var r_text_temp = chunk.substring(p_taIdentRef+k, n_chunk);
                                var t  = r_text_temp.indexOf("itsrdf:taIdentRef");
                                if (t == -1){
                                    terminate = true;
                                }
                                else {
                                    p_taIdentRef = p_taIdentRef+t+k;
                                    r_text = chunk.substring(p_taIdentRef, n_chunk);
                                }
                            } else{terminate = true;}
                        }
                        
                        /*var r_text = chunk.substring(p_taIdentRef, n_chunk);
                        var fin_taIdentRef = r_text.indexOf('>');
                        if (fin_taIdentRef == -1){
                            console.log("--->> Error, there musts be a nif:taIdentRef triple (end)");
                            continue;
                        }
                        var uri = r_text.substring(19,fin_taIdentRef);*/


                        var id_s_t = id_s-1
                        //console.log("=====>",startPosition,parseInt(startPosition), endPosition, parseInt(endPosition));
                        ann = {   // esta variable global la voy a completar cuando  llene el URI y a taxonomia en el modal
                                  "ini":parseInt(startPosition) + overall - sent_text.length-1,
                                  "fin":parseInt(endPosition)+ overall - sent_text.length-1,
                                  "id_sentence":id_s_t.toString(),
                                  "label":label,
                                  "uri": list_uri
                        };


                        //itsrdf:taClassRef nerd:AdministrativeRegion ;
                        var p_taClassRef = chunk.indexOf("itsrdf:taClassRef");
                        //console.log("p_taClassRef",p_taClassRef);
                        if (p_taClassRef != -1){
		                    var r_text = chunk.substring(p_taClassRef, n_chunk);
		                    var fin_taClassRef = r_text.indexOf(';');
		                    if (fin_taClassRef == -1){
		                        console.log("--->> Error, there musts be a nif:taClassRef triple (end)");
		                        continue;
		                    }

		                    var tag = r_text.substring(18,fin_taClassRef);
                            tag = tag.trim();
                            //console.log("tag:",tag);
                            ann["tag"] = tag;
                            if (tag == "tax:Ambiguous"){
                                $("#taxonomyInput").select2("val",85); // fijo, hay que ponerlo dinamico
                            }
                        }
                        ann["idA"] = A.length;
                        A.push(ann);
                    }
                    else{ // it's  Sentence

                        // text's sentence
                        var p_isString = chunk.indexOf("nif:isString");
                        if (p_isString == -1){
                            console.log("--->> Error, there musts be a nif:isString triple (start)");
                            continue;
                        }
                        
                        var r_text = chunk.substring(p_isString, n_chunk);
                        var fin_isString = r_text.indexOf('"""^^xsd:string');
                        if (fin_isString == -1){
                            var fin_isString = r_text.indexOf('"^^xsd:string');
                            if (fin_isString == -1){
                                console.log("--->> Error, there musts be a nif:isString triple (end)");
                                continue;
                            } else {
                                sent_text = r_text.substring(14,fin_isString);
                            }
                            
                        }
                        else{
                            sent_text = r_text.substring(16,fin_isString);
                        }
                        
                        Sentences.push(sent_text);


                        // uri's sentence 
                        sent_uri = chunk.substring(1,chunk.indexOf("#"));

                        // sent_ini and send_fin are not used yet
                        var sent_ini = 0;
                        var sent_fin = 0;
                         
                        //uridoc
                        if (uridoc==""){
                            var u_text = chunk.substring(p_ref, n_chunk);
                            var i_number = u_text.indexOf("<http");
                            var p_number = u_text.indexOf("#");
                            if (p_number != -1){
                                uridoc = u_text.substring(i_number + 1,p_number); // 22
                            }
                            else {
                                var p_number = u_text.indexOf(">");
                                uridoc = u_text.substring(i_number + 1,p_number); // 8
                            }
                            $("#inIdDoc").val(uridoc);
                        }
                        idSentence2dicc[id_s] = {"uri": sent_uri, "ini":sent_ini, "fin":sent_fin, "len":sent_text.length};
                        id_s = id_s + 1;
                        overall = overall + sent_text.length +1;
                    }
                } 
                chunk = "";
            }

            
        }

        // Display the sentences in the text area
        var text = "";
        for (i in Sentences){
            s = Sentences[i];
            text= text  + s + "\n";
        }
        n = text.length;
        $("#inDoc").val(text);

       // enable/disable buttons
        $("#divShow").removeClass("hide");
        $("#inDoc").prop("readonly",true);
        $("#btn_3_annotation").prop( "disabled", false ); //Enable
	$("#btn_4_annotation").prop( "disabled", false ); //Enable
        $("#btn_1_split").prop( "disabled", true ); //Disable


       //Update show-divs
       buildNIFCorpora();       
    });





    ///------- modify annotation
    //classlabelAnnotation
    //$(".blueLabel").click(function(){
    $('body').on('click', 'span.blueLabel' , function(){
        var ide = $(this).attr("ide");
        if (A.length <= ide){
            warning_alert("Error: there are problems with the identifier of the annotations");
            return 0;
        }
 
        ann = A[ide];
        $("#modalModifyAnnotation-title-desc").val(ann["label"]);
        $("#modalModifyAnnotationLabel").val(ann["label"]);
        


       
        $("#modalModifyAnnotationSelectTaxonomy").empty();
        var listInputTaxonomy = $("#taxonomyInput").select2('data');
        select = document.getElementById('modalModifyAnnotationSelectTaxonomy');
        
        //--none first
        var optNone = document.createElement('option');
        optNone.value = 1000;
        optNone.text = "-none-";
        select.add(optNone);
        
        //others
        if (listInputTaxonomy.length != 0){
            for (i in listInputTaxonomy){
                v = listInputTaxonomy[i];
                var option = document.createElement('option');
                option.value = i;
                option.text = v["text"];
                select.add(option);
            }
        }  

        //$("#modalModifyAnnotationSelectURI").val(ann["uri"]);
        remove_input_uris();
        $("#modalModifyAnnotationSelectURI").val("");
        for (k in ann["uri"]){
            var text = ann["uri"][k];
            var html ='<div class="control-group input-group taIdentRefContainer" style="margin-top:10px">'+
                      '<input id="annotation_'+k+'" value="'+text+'" type="text" name="addmore[]" class="form-control taIdentRef" placeholder="Enter Name Here">'+
                      '<div class="input-group-btn"> '+
                           '<button class="btn btn-info link" type="button"><i class="glyphicon glyphicon-link"></i> <a href="'+text+'" target="_blank">Link</a></button>'+
                          '<button class="btn btn-danger remove" type="button"><i class="glyphicon glyphicon-remove"></i> Remove</button>'+
                      '</div>'+
                   '</div>';
          
          $(".after-add-more-modification").after(html);
          //$("#annotation_"+k).val(text);
        }
        $("#modalModifyAnnotationSelectURI").attr("number",ann["uri"].length+1);
        
        
        //--
        if ("tag" in ann){
            var listInputTaxonomy = $("#taxonomyInput").select2('data');
            for (k in listInputTaxonomy){
                var l = listInputTaxonomy[k];
                if (ann["tag"] == l["text"]){
                    $("#modalModifyAnnotationSelectTaxonomy").val(k);
                    break;
                }
            }
        }
        else{
            document.getElementById('modalModifyAnnotationSelectTaxonomy').selectedIndex = -1;
        }
        //$("#a_link").attr("href",ann["uri"]);
        $("#btn_delete_ann").attr("ide",ide);
        $("#btn_modify").attr("ide",ide);
        $("#btn_modify").attr("surfaceform",ann["label"]);
        $("#modalModifyAnnotation").modal("show");
    });
    
    restar_idA_in_Annotations = function(){
      for (i in A){
            a = A[i];
            a["idA"] = i;
        }
    }

    $("#btn_delete_ann").click(function(){
        var ide = $(this).attr("ide");
        A.splice(ide,1);
        restar_idA_in_Annotations();
        buildNIFCorpora(); 
        remove_input_uris();
    });
    
    
    // return the sums of the lenths of the sentences before to the senteces with identifier ids
    offset_sentence = function(ids){
      var l = 0;
      for (var i in Sentences){
          sent = Sentences[i];
          if (i < ids){
              l = l + sent.length +1;
          }
      }
      return l;
    }
    
    
    $(".add-more-modification").click(function(){ 
          ///var html = $(".copy").html();
          ///console.log(html);
          var id = $("#modalModifyAnnotationSelectURI").attr("number");
          var html ='<div class="control-group input-group taIdentRefContainer" style="margin-top:10px">'+
                      '<input id="annotation_'+id+'" type="text" name="addmore[]" class="form-control taIdentRef" placeholder="Enter Name Here">'+
                      '<div class="input-group-btn"> '+
                          '<button class="btn btn-danger remove" type="button"><i class="glyphicon glyphicon-remove"></i> Remove</button>'+
                      '</div>'+
                   '</div>';
          
          $(".after-add-more-modification").after(html);

          var text = $("#modalModifyAnnotationSelectURI").val();
          $("#annotation_"+id).val(text);
          $("#modalModifyAnnotationSelectURI").attr("number",parseInt(id)+1);
          $("#modalModifyAnnotationSelectURI").val("");
          $("#modalModifyAnnotationSelectURI").focus();

      });


    $("#btn_modify").click(function(){
        var ide = $(this).attr("ide");
        //var in_uri = $("#modalModifyAnnotationSelectURI").val();
        //if (!in_uri){
        //    warning_alert("Debe de entrar una URI");
        //    return 0;
        //}
        //else {
            //A[ide]["uri"] = in_uri;
	    
	    
	    var list_uri = [];
            $('.taIdentRef').each(function() {
                var text = $(this).val();
                if (text!=""){
                    list_uri.push(text);
                }
                
            });

            var in_uri = $("#modalModifyAnnotationSelectURI").val();
            if (in_uri){
                list_uri.push(in_uri);
            }
               
            if (list_uri.length == 0){
                warning_alert("Debe de entrar una URI");
                return 0;
            }
            
            A[ide]["uri"] = list_uri;
	    
	    
	    
	    
	    
            //console.log("in_uri:",in_uri);
            //warning_alert($("#modalSelectTaxonomy").val());
            var tax_val = $("#modalModifyAnnotationSelectTaxonomy").val();
            if (tax_val){
                if (parseInt(tax_val)!=1000){ // if it's not "-none-"
                    var listInputTaxonomy = $("#taxonomyInput").select2('data');
                    if (listInputTaxonomy.length >0){
                        var ann_tax_val = listInputTaxonomy[tax_val];
                        var tag_text = ann_tax_val["text"];
                        A[ide]["tag"] = tag_text;//$("#modalSelectTaxonomy").text();
                    }
                }
                else{
                    delete A[ide]["tag"];
                }
            }
            
            //surface form
            var ann_label = $("#modalModifyAnnotationLabel").val();
            var btn_label = $("#btn_modify").attr("surfaceform");
            if (ann_label != btn_label){
                
                // actualizo esta anotacion --------
                var ids = parseInt(A[ide]["id_sentence"]);
                var slength = Sentences[ids].length;
                var lbeforeToS = offset_sentence(ids);
                var sini = A[ide]["ini"] - lbeforeToS;
                var sfin = A[ide]["fin"] - lbeforeToS;
                var new_s = Sentences[ids].substr(0,sini) +ann_label+ Sentences[ids].substr(sfin,slength);
                Sentences[ids] = new_s;
                A[ide]["fin"] = A[ide]["ini"] + ann_label.length;
                A[ide]["label"] = ann_label;
                
                // actualizo los ids de las annotaciones de esta misma oracion que ocurren luego de ellas ------
                var delta = ann_label.length - btn_label.length;
                for (k in A){
                    ann = A[k];
                    //if (ann["id_sentence"]>A[ide]["id_sentence"]  ||  (ann["id_sentence"]==A[ide]["id_sentence"] && ann["ini"]>A[ide]["ini"])){
                    if (ann["ini"]>A[ide]["ini"]){
                        ann["ini"] = ann["ini"] + delta;
                        ann["fin"] = ann["fin"] + delta;
                    }
                }
                
                // actualizo el inDoc --------
                var text = "";
                for (i in Sentences){
                    s = Sentences[i];
                    text= text  + s + "\n";
                }
                n = text.length;
                $("#inDoc").val(text);
            }
        //}
        $("#nifdoc").val("");
        buildNIFCorpora(); 
        $('#modalModifyAnnotation').modal("hide"); 
        remove_input_uris();
    });
    

    $('ul.tabs li').click(function(){
        var tab_id = $(this).attr('data-tab');

        $('ul.tabs li').removeClass('current');
        $('.tab-content').removeClass('current');

        $(this).addClass('current');
        $("#"+tab_id).addClass('current');
    })
    
    
    
    //---- annotation modal, add multiannotations
    $(".add-more").click(function(){ 
          ///var html = $(".copy").html();
          ///console.log(html);
          var id = $("#modalSelectURI").attr("number");
          var html ='<div class="control-group input-group taIdentRefContainer" style="margin-top:10px">'+
                      '<input id="annotation_'+id+'" type="text" name="addmore[]" class="form-control taIdentRef" placeholder="Enter Name Here">'+
                      '<div class="input-group-btn"> '+
                          '<button class="btn btn-danger remove" type="button"><i class="glyphicon glyphicon-remove"></i> Remove</button>'+
                      '</div>'+
                   '</div>';
          
          $(".after-add-more").after(html);

          var text = $("#modalSelectURI").val();
          $("#annotation_"+id).val(text);
          $("#modalSelectURI").attr("number",parseInt(id)+1);
          $("#modalSelectURI").val("");
          $("#modalSelectURI").focus();

      });

      $("body").on("click",".remove",function(){ 
          $(this).parents(".control-group").remove();
      });
    
    
    // checking varibles
    /*$_GET=[];
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,function(a,name,value){$_GET[name]=value;});
    
    function processFiles(file) {
        //var file = files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
            // Cuando éste evento se dispara, los datos están ya disponibles.
            // Se trata de copiarlos a una área <div> en la página.
            var output = document.getElementById("inDoc"); 
            output.textContent = e.target.result;
        };
        reader.readAsText(file);
    }*/
    
    
    
    //------ remove all tags
    $("#removeTaxonomy").click(function(){
      BootstrapDialog.show({
            title: 'Erasing all the Tags',
            message: 'Are you sure you want to delete all the tags in the annotations?',
            buttons: [{
                cssClass: 'btn-primary',
                label: 'Yes',
                action: function(dialog) {
                    delete_all_tags();
                    dialog.close();
                }
            }, {
                label: 'No',
                action: function(dialog) {
                    dialog.close();
                }
            }]
        });
    });
    
    
    delete_all_tags = function(){
      for (i in A){
          a = A[i];
          if ("tag" in a){
              delete a["tag"];
          }
      }
      buildNIFCorpora();
      $('#taxonomyInput').val('').trigger("change");
    }
    
    
    //---- automatically annotate previous annotations from dictionaries
    //Dictionary = [{"label":"henry", "annotations":["https://es.wikipedia.org/wiki/Joseph_Henry","https://es.wikipedia.org/wiki/Thierry_Henry"]}];
    $("#btn_4_annotation").click(function(){
      BootstrapDialog.show({
            title: 'Automatic Annotations',
            message: 'Are you sure you want to add the automatic annotations?',
            buttons: [{
                cssClass: 'btn-primary',
                label: 'Yes',
                action: function(dialog) {
                    automatic_annotations();
                    dialog.close();
                }
            }, {
                label: 'No',
                action: function(dialog) {
                    dialog.close();
                }
            }]
        });
    });
    
    
    // find if there is annotated the mention started by "ini" until  "fin"
    notAnnotatedYet = function(ini,fin){
      for (k in A){
          var ann = A[k];
          if (ann["ini"] == ini && ann["fin"] == fin){
              return k; // it's already annotated
          }
      }
      return -1;
    }
    
    
    // Perfom the automatic annotations
    var punctuationsSign = {" ":"", "\n":"", ".":"", ",":"", ";":"", "-":"","'":"", '"':"", "”":"", ")":"", "(":"", "[":"", "]":"", "<":"", ">":""};
    automatic_annotations = function(){
      var text = $("#inDoc").val();
      
      for(i in Dictionary){
          var d = Dictionary[i];
          var t = d["label"];
          var t_len = t.length;
          var txt = text;
          var p = txt.indexOf(t);
          var overall = 0;
          while (p!=-1){
              var ini = overall + p;
              var fin = overall + p + t_len;
              var posInA = notAnnotatedYet(ini,fin);
              if (posInA == -1){ 
                  if ( (p==0 || txt[p-1] in punctuationsSign) && (p+t_len==txt.length || txt[p+t_len] in punctuationsSign) ){
                      A.push({
                          "ini":ini, 
                          "fin":fin, 
                          "uri":d["annotations"], 
                          "id_sentence": sent2id(ini),
                          "label":t
                      });
                  }

              }
              else{ // I will add the missing annotations
                  var U = A[posInA]["uri"];
                  for (t in U){
                      u = U[t];
                      if ($.inArray(u,U) == -1){
                          A[posInA]["uri"].push(u);
                      }
                  }
              }
              overall = fin;
              var temp_txt = txt.substr(p + t_len,txt.lenth);
              txt = temp_txt;
              p = txt.indexOf(t);
          }
      }
      restar_idA_in_Annotations();
      buildNIFCorpora(); 
    }
    
    //--- Review
    $("#btn_review").click(function(){
      
        if ('Blob' in window) {
	  BootstrapDialog.show({
            message: '<label for="filename_input" class="col-form-label">File Name:</label> ' +
                     '<input type="text" class="form-control espacioAbajo" id="filename_input" '+
                     'placeholder="Name of the file">',
            title: 'Saving file with annotations',
            buttons: [{
                label: 'Close',
                action: function(dialog) {
                    dialog.close();
                }
            }, {
                label: 'Ok',
                action: function(dialog) {
                    var fileName = $("#filename_input").val();
                    var Text = "";
        
                    $('span').each(function() {
                        var ide = $(this).attr("ide");
                        if (ide && ide!=""){
                            var a = A[ide];
                            $(this).html("("+ide+")"+$(this).html());
                            Text = Text + "---------------------------------------\n";
                            Text = Text + "(" + ide + ")  ";
                            var first = true;
                            for (j in a["uri"]){
                                var t = a["uri"][j];
                                if (first){
                                    var len = ide.length;
                                    var prefix_s = "";
                                    for (var k = len; k <4; k++) {
                                        prefix_s = prefix_s + " ";
                                    }
                                    Text = Text +prefix_s+t+"\n";
                                }
                                else {
                                    Text = Text +"        "+t+"\n";
                                }
                                first = false;
                            }
                        }
                    });

        
        
                    var textToWrite = Encoder.htmlDecode(replaceAll(Text,"<br>","\n"));
                    var textFileAsBlob = new Blob([textToWrite], { type: 'text/plain' });
                    if ('msSaveOrOpenBlob' in navigator) {
                        navigator.msSaveOrOpenBlob(textFileAsBlob, fileName);
                    } else {
                        var downloadLink = document.createElement('a');
                        downloadLink.download = fileName;
                        downloadLink.innerHTML = 'Download File';
                        if ('webkitURL' in window) {
                            // Chrome allows the link to be clicked without actually adding it to the DOM.
                            downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
                        } else {
                            // Firefox requires the link to be added to the DOM before it can be clicked.
                            downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
                            downloadLink.onclick = function(){};
                            downloadLink.style.display = 'none';
                            document.body.appendChild(downloadLink);
                        }
                        downloadLink.click();
                    }
                    dialog.close();
                }
            }]
        });
	  
	} else {
	  alert('Your browser does not support the HTML5 Blob.');
	}
	
	
        
    });
});



















